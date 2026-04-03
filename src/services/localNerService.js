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

/** Strips generic English / JD boilerplate so overlap scores reflect substance, not "the", "experience", etc. */
const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old", "see", "two", "way", "who", "did", "let", "put", "say", "she", "too", "use", "any", "job", "jobs", "work", "team", "with", "from", "this", "that", "have", "will", "your", "what", "when", "where", "which", "while", "about", "after", "before", "being", "been", "more", "most", "some", "such", "than", "them", "then", "these", "those", "very", "just", "into", "over", "also", "back", "only", "know", "take", "year", "years", "good", "great", "make", "made", "need", "must", "well", "come", "each", "same", "here", "both", "such", "able",
  "looking", "opportunity", "opportunities", "company", "companies", "role", "roles", "position", "positions", "candidate", "candidates", "required", "requirements", "requirement", "preferred", "preferably", "experience", "experiences", "responsibilities", "responsibility", "include", "including", "included", "ability", "abilities", "skills", "skill", "strong", "strongly", "excellent", "understanding", "degree", "degrees", "university", "college", "remote", "hybrid", "onsite", "full", "time", "part", "based", "join", "us", "best", "ideal", "seeking", "hire", "hiring", "apply", "application", "please", "equivalent", "related", "field", "fields", "other", "using", "used", "help", "support", "ensure", "across", "within", "without", "via", "etc",
]);

function tokenizeContentWords(text) {
  return tokenizeWords(text).filter((w) => !STOPWORDS.has(w));
}

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
  const sa = new Set(tokenizeContentWords(a));
  const sb = new Set(tokenizeContentWords(b));
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

function titleAlignmentScore(resumeText, jobTitle) {
  const title = (jobTitle || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = title.split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
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

  const hasListedJobSkills = jobSkillList.length > 0;
  const noSkillOverlap = hasListedJobSkills && matched.length === 0;

  let roleChannel = 0;
  if (jobEx?.role_terms?.length && resumeEx?.role_terms?.length) {
    roleChannel = roleOverlapScore(jobEx.role_terms, resumeEx.role_terms);
  } else {
    roleChannel = titleAlignmentScore(resumeText, job?.title);
  }
  // Title/role signal is weaker when required skills do not overlap at all
  const roleWeight = noSkillOverlap ? 10 : 20;
  const roleScore = roleChannel * roleWeight;

  let descLex = jaccardTokens(resumeText, job?.description || "") * 16;
  if (noSkillOverlap) descLex *= 0.35;

  const resumeLen = (resumeText || "").trim().length;
  const baseline = hasListedJobSkills ? (noSkillOverlap ? 0 : 5) : 8;
  let total = Math.min(99, Math.round(baseline + skillScore + roleScore + descLex));

  if (noSkillOverlap) {
    total = Math.min(total, 26);
  } else if (hasListedJobSkills && skillRatio < 0.25) {
    total = Math.min(total, Math.round(total * 0.85));
  }

  if (resumeLen < 40 && !normalizeProfileSkills(profileSkills).length) {
    total = Math.min(total, 12);
  }

  const textQuality = Math.min(
    1,
    (resumeLen / 1200) * 0.45 + ((job?.description || "").length / 2000) * 0.45 + 0.1,
  );
  const extractorSignal =
    (nerResumeSkills.length + nerJobSkills.length > 0 ? 0.35 : 0) + Math.min(0.35, skillRatio);
  let confidenceScore = Math.round(
    Math.min(100, textQuality * 38 + extractorSignal * 45 + skillRatio * 25 + 7),
  );
  if (noSkillOverlap) confidenceScore = Math.min(confidenceScore, 38);
  if (resumeLen < 40 && !normalizeProfileSkills(profileSkills).length) {
    confidenceScore = Math.min(confidenceScore, 22);
  }

  const displayMatched = [...new Set([...matched])].slice(0, 24);
  const displayMissing = [...new Set([...missing])].slice(0, 24);

  const summaryMsg =
    displayMatched.length > 0
      ? `NER match: ${displayMatched.length} of ${jobSkillList.length} job skills align with the resume (model + listing).`
      : jobSkillList.length > 0
        ? noSkillOverlap
          ? "NER match: No overlapping skills between this posting and your resume were found."
          : `NER match: Partial overlap; estimated fit ~${total}%.`
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
  const listedSkills = (job?.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  const jobParts = [
    ...listedSkills,
    ...tokenizeContentWords(job?.description),
    ...tokenizeContentWords(job?.title),
  ];
  const jobTok = new Set(jobParts);
  const resumeTok = new Set([
    ...tokenizeContentWords(resumeText),
    ...profileList.map((s) => s.toLowerCase()).filter((s) => s && !STOPWORDS.has(s)),
  ]);

  let overlap = 0;
  for (const t of jobTok) if (resumeTok.has(t)) overlap++;

  const denom = Math.max(jobTok.size, 1);
  const ratio = Math.min(1, overlap / Math.sqrt(denom + 1) / 6);
  const skillScore = ratio * 55;
  const titleScore = titleAlignmentScore(resumeText, job?.title) * 18;
  const baseline = listedSkills.length ? 2 : 8;
  const resumeLen = (resumeText || "").trim().length;
  let total = Math.min(99, Math.round(baseline + skillScore + titleScore));

  const hasExplicitSkills = listedSkills.length > 0;
  const skillTokenOverlap = listedSkills.some((s) => resumeTok.has(s) || resumeTok.has(normalizeSkillKey(s)));
  if (hasExplicitSkills && !skillTokenOverlap) {
    total = Math.min(total, 24);
  }
  if (resumeLen < 40 && !profileList.length) {
    total = Math.min(total, 12);
  }

  let confidence = Math.round(28 + ratio * 35);
  if (hasExplicitSkills && !skillTokenOverlap) confidence = Math.min(confidence, 35);
  if (resumeLen < 40 && !profileList.length) confidence = Math.min(confidence, 22);

  return {
    score: total,
    confidence,
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
