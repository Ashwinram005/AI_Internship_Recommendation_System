/**
 * Dynamic skill / role extraction via local spaCy NER (Hugging Face skill-extractor).
 * Requires server/skill_extractor_server.py running (see package.json "skill-server").
 *
 * URL resolution:
 * - If VITE_SKILL_EXTRACTOR_URL is set → use it (any environment).
 * - Else in dev → /skill-api (Vite proxies to the Python server; see vite.config.js).
 * - Else (production build) → direct http://127.0.0.1:8765 (set env for real deployments).
 */
function getSkillExtractorBaseUrl() {
  const explicit = import.meta.env.VITE_SKILL_EXTRACTOR_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (import.meta.env.DEV) return '/skill-api';
  return 'http://127.0.0.1:8765';
}

const normalizeSkillKey = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const normalizeProfileSkills = (profileSkills) => {
  if (!profileSkills) return [];
  if (typeof profileSkills === "string") {
    return profileSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return profileSkills.map((s) => String(s).trim()).filter(Boolean);
};

export const buildResumeBlob = (resumeText, profileSkills = []) => {
  const parts = [resumeText || "", normalizeProfileSkills(profileSkills).join(", ")].filter(
    Boolean,
  );
  return parts.join("\n\n").slice(0, 12000);
};

export const buildJobBlob = (job) => {
  const parts = [
    job?.title || "",
    job?.skills || "",
    job?.description || "",
  ].filter(Boolean);
  return parts.join("\n\n").slice(0, 12000);
};

/**
 * @param {string[]} texts
 * @returns {Promise<Array<{ skills: string[], role_terms: string[], entities: Array<{text: string, label: string}> }>>}
 */
export async function extractSkillModelBatch(texts) {
  const base = getSkillExtractorBaseUrl();
  const res = await fetch(`${base}/api/extract/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      texts: (texts || []).map((t) => String(t || "").slice(0, 12000)),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Skill extractor ${res.status}: ${detail || res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data?.results)) {
    throw new Error("Skill extractor returned invalid payload");
  }
  return data.results;
}

const tokenizeWords = (text) =>
  (text || "")
    .toLowerCase()
    .split(/[^a-z0-9+#./]+/)
    .filter((w) => w.length > 2);

function flattenResumeKeys(displayResumeSkills) {
  const flat = new Set();
  for (const s of displayResumeSkills) {
    const k = normalizeSkillKey(s);
    if (k) flat.add(k);
    for (const part of k.split(/[,/]/).map((p) => p.trim()).filter(Boolean)) {
      if (part.length > 1) flat.add(part.toLowerCase());
    }
    for (const w of k.split(/\s+/)) {
      if (w.length > 2) flat.add(w);
    }
  }
  return flat;
}

function fuzzyJobMatchesResume(jobSkillNorm, resumeKeysFlat) {
  if (!jobSkillNorm || !resumeKeysFlat.size) return false;
  if (resumeKeysFlat.has(jobSkillNorm)) return true;

  for (const rk of resumeKeysFlat) {
    if (!rk) continue;
    if (jobSkillNorm === rk) return true;
    if (
      jobSkillNorm.length >= 3 &&
      rk.length >= 3 &&
      (jobSkillNorm.includes(rk) || rk.includes(jobSkillNorm))
    ) {
      return true;
    }
    const ja = jobSkillNorm.split(/\s+/).filter((p) => p.length > 1);
    const ra = rk.split(/\s+/).filter((p) => p.length > 1);
    if (ja.length && ra.length) {
      const setR = new Set(ra);
      const inter = ja.filter((p) => setR.has(p)).length;
      const union = new Set([...ja, ...ra]).size;
      if (union > 0 && inter / union >= 0.5) return true;
    }
  }
  return false;
}

function partitionJobSkills(jobSkillList, displayResumeSkills) {
  const resumeKeysFlat = flattenResumeKeys(displayResumeSkills);
  const matched = [];
  const missing = [];

  for (const js of jobSkillList) {
    const jn = normalizeSkillKey(js);
    if (!jn) continue;
    if (fuzzyJobMatchesResume(jn, resumeKeysFlat)) matched.push(js);
    else missing.push(js);
  }

  return { matched: [...new Set(matched)], missing: [...new Set(missing)] };
}

function jaccardTokens(a, b) {
  const sa = new Set(tokenizeWords(a));
  const sb = new Set(tokenizeWords(b));
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

function titleAlignmentScore(resumeText, jobTitle) {
  const title = (jobTitle || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = title.split(/\s+/).filter((w) => w.length > 2);
  if (!words.length) return 0;
  const low = (resumeText || "").toLowerCase();
  const hits = words.filter((w) => {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return re.test(low);
  });
  return hits.length / words.length;
}

function roleOverlapScore(rJob, rResume) {
  const a = (rJob || []).map(normalizeSkillKey).filter(Boolean);
  const b = (rResume || []).map(normalizeSkillKey).filter(Boolean);
  if (!a.length || !b.length) return 0;
  let hits = 0;
  for (const x of a) {
    for (const y of b) {
      if (x === y || (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x)))) {
        hits++;
        break;
      }
    }
  }
  return hits / a.length;
}

/**
 * Score from precomputed NER outputs (use with extractSkillModelBatch).
 */
export function scoreFromExtracts(
  resumeEx,
  jobEx,
  resumeText,
  job,
  profileSkills = [],
) {
  const profileList = normalizeProfileSkills(profileSkills);
  const nerResumeSkills = [...(resumeEx?.skills || [])];
  const nerJobSkills = [...(jobEx?.skills || [])];

  const explicitJobSkills = (job?.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const jobSkillList = [...new Set([...nerJobSkills, ...explicitJobSkills])];

  const displayResumeSkills = [...new Set([...nerResumeSkills, ...profileList])];

  const { matched, missing } = partitionJobSkills(jobSkillList, displayResumeSkills);

  const jobSkillCount = new Set(jobSkillList.map(normalizeSkillKey).filter(Boolean)).size || 1;
  const skillRatio = Math.min(1, matched.length / jobSkillCount);
  const skillScore = skillRatio * 52;

  let roleChannel = 0;
  if (jobEx?.role_terms?.length && resumeEx?.role_terms?.length) {
    roleChannel = roleOverlapScore(jobEx.role_terms, resumeEx.role_terms);
  } else {
    roleChannel = titleAlignmentScore(resumeText, job?.title);
  }
  const roleScore = roleChannel * 20;

  const descLex = jaccardTokens(resumeText, job?.description || "") * 16;

  const baseline = 8;
  const total = Math.min(99, Math.round(baseline + skillScore + roleScore + descLex));

  const textQuality = Math.min(
    1,
    ((resumeText || "").length / 1200) * 0.45 + ((job?.description || "").length / 2000) * 0.45 + 0.1,
  );
  const extractorSignal =
    (nerResumeSkills.length + nerJobSkills.length > 0 ? 0.35 : 0) + Math.min(0.35, skillRatio);
  const confidenceScore = Math.round(
    Math.min(100, textQuality * 38 + extractorSignal * 45 + skillRatio * 25 + 7),
  );

  const displayMatched = [...new Set([...matched])].slice(0, 24);
  const displayMissing = [...new Set([...missing])].slice(0, 24);

  const summaryMsg =
    displayMatched.length > 0
      ? `NER match: ${displayMatched.length} of ${jobSkillList.length} job skills align with the resume (model + listing).`
      : jobSkillList.length > 0
        ? `NER match: Few explicit overlaps yet; lexical signals score ~${total}%.`
        : `NER match: Limited labeled skills in posting; score leans on description fit.`;

  return {
    score: total,
    confidence: confidenceScore,
    matchedSkills: displayMatched.map(
      (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
    ),
    missingSkills: displayMissing.map(
      (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
    ),
    summary: summaryMsg,
  };
}

/**
 * Pure lexical fallback when the Python NER service is unreachable.
 */
export function scoreLexicalOnly(resumeText, job, profileSkills = []) {
  const profileList = normalizeProfileSkills(profileSkills);
  const jobParts = [
    ...(job?.skills || "").split(",").map((s) => s.trim()).filter(Boolean),
    ...tokenizeWords(job?.description),
    ...tokenizeWords(job?.title),
  ];
  const jobTok = new Set(jobParts.map((t) => t.toLowerCase()));
  const resumeTok = new Set([
    ...tokenizeWords(resumeText),
    ...profileList.map((s) => s.toLowerCase()),
  ]);

  let overlap = 0;
  for (const t of jobTok) if (resumeTok.has(t)) overlap++;

  const denom = Math.max(jobTok.size, 1);
  const ratio = Math.min(1, overlap / Math.sqrt(denom + 1) / 6);
  const skillScore = ratio * 55;
  const titleScore = titleAlignmentScore(resumeText, job?.title) * 22;
  const baseline = 10;
  const total = Math.min(99, Math.round(baseline + skillScore + titleScore));

  return {
    score: total,
    confidence: Math.round(32 + ratio * 40),
    matchedSkills: [],
    missingSkills: [],
    summary:
      "Skill NER service unavailable; approximate score from text overlap only. Start the Python skill-server.",
  };
}

/** Single resume vs job round-trip (not batched). */
export async function calculateLocalMatchScore(resumeText, job, profileSkills = []) {
  try {
    const batch = await extractSkillModelBatch([
      buildResumeBlob(resumeText, profileSkills),
      buildJobBlob(job),
    ]);
    return scoreFromExtracts(batch[0], batch[1], resumeText, job, profileSkills);
  } catch {
    return scoreLexicalOnly(resumeText, job, profileSkills);
  }
}
