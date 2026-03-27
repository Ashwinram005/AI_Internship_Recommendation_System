import { convertDocToHtml, inferResumeMimeType, isDocResume } from "../utils/resumePreview";
import OpenAI from "openai";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_JOBS_PER_REQUEST = 20;
const MAX_CANDIDATES_PER_REQUEST = 25;
const MAX_TEXT_LENGTH = 6000;
const MAX_MISSING_ITEMS = 8;

const normalizeText = (value = "") => value.replace(/\s+/g, " ").trim();

const stripDataUrlBase64 = (dataUrl = "") => {
  const parts = dataUrl.split(",");
  return parts.length > 1 ? parts[1] : "";
};

const extractTextFromHtml = (html = "") => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const tokenize = (value = "") =>
  normalizeText(value)
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length > 1);

const unique = (values = []) => [...new Set(values.filter(Boolean))];

const getJobSkillList = (job) =>
  unique(
    (job?.skills || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

const splitRequirementText = (value = "") =>
  value
    .replace(/[\r\n]+/g, " ")
    .split(/\.|;|\u2022|\||,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 3);

const cleanRequirementPhrase = (value = "") => {
  const cleaned = normalizeText(value)
    .replace(/^[-:*\d.)\s]+/, "")
    .replace(/^(must|should|need to|required to)\s+/i, "")
    .trim();
  return cleaned;
};

const getJobRequirementList = (job) => {
  const fromSkills = getJobSkillList(job);
  const fromDescription = splitRequirementText(job?.description || "")
    .map(cleanRequirementPhrase)
    .filter((item) => item.length >= 5)
    .filter((item) => item.length <= 100)
    .filter((item) => /[a-zA-Z]/.test(item));

  return unique([...fromSkills, ...fromDescription]).slice(0, 20);
};

const hasRequirementMatch = (resumeTokens, requirement) => {
  const tokens = tokenize(requirement);
  if (!tokens.length) return false;

  const overlap = tokens.filter((token) => resumeTokens.has(token)).length;
  const ratio = overlap / tokens.length;

  // Allow partial match for longer requirements from descriptions.
  if (tokens.length >= 6) return ratio >= 0.4;
  if (tokens.length >= 3) return ratio >= 0.5;
  return ratio >= 1;
};

import { calculateLocalMatchScore } from "./localNerService";

const localRankScore = ({ resumeText, job }) => {
  return calculateLocalMatchScore(resumeText, job);
};

// ... keep original tokenize/unique helpers if needed ...

const getGroqClient = (apiKey) =>
  new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

const callGroqJson = async ({ apiKey, prompt }) => {
  const client = getGroqClient(apiKey);
  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are a precise ATS matching assistant. Return JSON only." },
      { role: "user", content: prompt },
    ],
  });

  const text = completion?.choices?.[0]?.message?.content || "{}";

  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    return JSON.parse(cleaned);
  }
};

export const getGroqKeyAvailable = () => Boolean(import.meta.env.VITE_GROQ_API_KEY);

export const extractResumePlainText = async (resume) => {
  if (!resume?.base64Data) return "";

  if (isDocResume(resume)) {
    const html = await convertDocToHtml(resume);
    return extractTextFromHtml(html).slice(0, MAX_TEXT_LENGTH);
  }

  return "";
};

const getInlineResumeDataIfPdf = (resume) => {
  if (!resume?.base64Data) return null;
  const mimeType = inferResumeMimeType(resume);
  if (!mimeType.toLowerCase().includes("pdf")) return null;
  const base64 = stripDataUrlBase64(resume.base64Data);
  if (!base64) return null;
  return { mimeType: "application/pdf", data: base64 };
};

export const rankJobsForResume = async ({ resume, jobs }) => {
  const safeJobs = (jobs || []).slice(0, MAX_JOBS_PER_REQUEST);
  if (!safeJobs.length) return [];

  const resumeText = await extractResumePlainText(resume);
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  const fallback = safeJobs
    .map((job) => {
      const estimate = localRankScore({ resumeText, job });
      return {
        jobId: job.id,
        score: estimate.score,
        matchedSkills: estimate.matchedSkills,
        missingSkills: estimate.missingSkills,
        summary: estimate.summary,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (!apiKey) return fallback;

  try {
    const prompt = [
      "You are a hiring match engine.",
      "Return strict JSON only with shape:",
      "{\"results\":[{\"jobId\":\"string\",\"score\":0-100 number,\"matchedSkills\":[\"skill\"],\"missingSkills\":[\"skill\"],\"summary\":\"short reason\"}]}",
      "Rules:",
      "1) Score must reflect resume fit to each job description.",
      "2) missingSkills should list specific important skills from the job not found in resume.",
      "2a) missingSkills must be derived from job description requirements, not just from the skills field.",
      "3) matchedSkills should list skills that appear to match.",
      "4) Keep summary under 18 words.",
      "Resume text:",
      resumeText || "No OCR text available. If PDF is attached, use that file content.",
      "Resume mime type:",
      inferResumeMimeType(resume),
      "Jobs JSON:",
      JSON.stringify(
        safeJobs.map((job) => ({
          jobId: job.id,
          title: job.title || "",
          skills: getJobSkillList(job),
          requirements: getJobRequirementList(job),
          description: normalizeText(job.description || "").slice(0, 2000),
          type: job.type || "job",
        })),
      ),
    ].join("\n");

    const json = await callGroqJson({ apiKey, prompt });
    const results = Array.isArray(json?.results) ? json.results : [];
    
    // Create a map for easy lookup
    const groqMap = results.reduce((acc, item) => {
      if (item.jobId) acc[item.jobId] = item;
      return acc;
    }, {});

    // Merge Groq results with fallback
    return fallback.map((fbItem) => {
      const gItem = groqMap[fbItem.jobId];
      if (gItem) {
        return {
          jobId: gItem.jobId,
          score: Math.max(0, Math.min(100, Number(gItem.score) || 0)),
          matchedSkills: unique([...(fbItem.matchedSkills || []), ...(gItem.matchedSkills || [])]),
          missingSkills: unique(gItem.missingSkills || []),
          summary: gItem.summary || fbItem.summary
        };
      }
      return fbItem;
    }).sort((a, b) => b.score - a.score);
  } catch (err) {
    console.warn("Groq job ranking failed, using fallback:", err);
    return fallback;
  }
};

export const rankCandidatesForJob = async ({ job, candidates }) => {
  const limited = (candidates || []).slice(0, MAX_CANDIDATES_PER_REQUEST);
  if (!job || !limited.length) return [];

  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  const candidateWithText = await Promise.all(
    limited.map(async (candidate) => ({
      ...candidate,
      resumeText: (await extractResumePlainText(candidate.resume)) || "",
      inlinePdf: getInlineResumeDataIfPdf(candidate.resume),
    })),
  );

  const fallback = candidateWithText
    .map((candidate) => {
      const estimate = localRankScore({ resumeText: candidate.resumeText, job });
      return {
        applicationId: candidate.applicationId,
        score: estimate.score,
        matchedSkills: estimate.matchedSkills,
        missingSkills: estimate.missingSkills,
        summary: estimate.summary,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (!apiKey) return fallback;

  const runSingleCandidateGroq = async (candidate) => {
    const prompt = [
      "You are an ATS evaluator for one candidate and one job.",
      "Return strict JSON only with shape:",
      "{\"applicationId\":\"string\",\"score\":0-100 number,\"matchedSkills\":[\"skill\"],\"missingSkills\":[\"skill\"],\"summary\":\"short reason\"}",
      "Job JSON:",
      JSON.stringify({
        title: job.title || "",
        description: normalizeText(job.description || "").slice(0, 3000),
        skills: getJobSkillList(job),
        requirements: getJobRequirementList(job),
      }),
      "Candidate:",
      JSON.stringify({
        applicationId: candidate.applicationId,
        candidateName: candidate.candidateName || "Candidate",
        resumeText: normalizeText(candidate.resumeText || "").slice(0, 3000),
        resumeName: candidate.resume?.fileName || "resume",
      }),
      "If resume text is limited, use title, skills, and description context for a conservative score.",
    ].join("\n");

    const json = await callGroqJson({ apiKey, prompt });

    return {
      applicationId: json.applicationId || candidate.applicationId,
      score: Math.max(0, Math.min(100, Number(json.score) || 0)),
      matchedSkills: unique(json.matchedSkills || []),
      missingSkills: unique(json.missingSkills || []),
      summary: json.summary || "AI candidate fit estimate",
    };
  };

  try {
    const prompt = [
      "You are an ATS evaluator for one job and multiple candidates.",
      "Return strict JSON only with shape:",
      "{\"results\":[{\"applicationId\":\"string\",\"score\":0-100 number,\"matchedSkills\":[\"skill\"],\"missingSkills\":[\"skill\"],\"summary\":\"short reason\"}]}",
      "Rules:",
      "1) Score each candidate for this specific job.",
      "2) Sort intent is descending by score; caller will sort again.",
      "3) summary should be concise and useful for recruiter triage.",
      "Job JSON:",
      JSON.stringify({
        title: job.title || "",
        description: normalizeText(job.description || "").slice(0, 3000),
        skills: getJobSkillList(job),
      }),
      "Candidates JSON:",
      JSON.stringify(
        candidateWithText.map((candidate) => ({
          applicationId: candidate.applicationId,
          candidateName: candidate.candidateName || "Candidate",
          resumeText: normalizeText(candidate.resumeText).slice(0, 3000),
          resumeName: candidate.resume?.fileName || "resume",
        })),
      ),
    ].join("\n");

    const json = await callGroqJson({ apiKey, prompt });
    const results = Array.isArray(json?.results) ? json.results : [];
    if (!results.length) return fallback;

    const ranked = results
      .map((item) => ({
        applicationId: item.applicationId,
        score: Math.max(0, Math.min(100, Number(item.score) || 0)),
        matchedSkills: unique(item.matchedSkills || []),
        missingSkills: unique(item.missingSkills || []),
        summary: item.summary || "AI candidate fit estimate",
      }))
      .filter((item) => item.applicationId);

    const mapped = ranked.reduce((acc, item) => {
      acc[item.applicationId] = item;
      return acc;
    }, {});

    const pdfCandidatesWithoutResult = candidateWithText.filter(
      (candidate) => candidate.inlinePdf && !mapped[candidate.applicationId],
    );

    for (const candidate of pdfCandidatesWithoutResult) {
      try {
        const item = await runSingleCandidateGroq(candidate);
        mapped[item.applicationId] = item;
      } catch (err) {
        console.warn("Single PDF candidate scoring failed:", err);
      }
    }

    return Object.values(mapped).sort((a, b) => b.score - a.score);
  } catch (err) {
    console.warn("Groq candidate ranking failed, using fallback:", err);
    return fallback;
  }
};
