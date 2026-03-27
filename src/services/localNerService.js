import nlp from "compromise";

// Custom dictionary for technical skills extraction
const TECH_SKILLS = [
  "javascript", "js", "typescript", "ts", "react", "next.js", "vue", "angular", "node.js", "node",
  "express", "python", "java", "c++", "c#", "golang", "rust", "php", "laravel", "ruby", "rails",
  "sql", "postgresql", "mysql", "mongodb", "redis", "firebase", "aws", "azure", "gcp", "docker",
  "kubernetes", "k8s", "git", "github", "ci/cd", "rest api", "graphql", "tailwind", "css", "html",
  "ui/ux", "figma", "machine learning", "ai", "deep learning", "nlp", "pytorch", "tensorflow",
  "data science", "tableau", "powerbi", "excel", "agile", "scrum", "project management"
];

const JOB_TITLES = [
  "software engineer", "developer", "full stack", "frontend", "backend", "data scientist",
  "product manager", "project manager", "designer", "devops", "cloud architect", "intern",
  "analyst", "qa", "tester"
];

// Extend compromise with our custom skills
const doc = nlp("");
nlp.extend((Doc, world) => {
  Doc.prototype.extractTech = function () {
    return this.match("(#Skill|#Tech|#Title)");
  };
});

/**
 * Extracts structured entities from text using rule-based and dictionary matching.
 */
export const extractLocalEntities = (text = "") => {
  if (!text) return { skills: [], experience: 0, titles: [] };

  const normalized = text.toLowerCase();
  const nlpDoc = nlp(normalized);

  // 1. Extract Skills (simple dictionary matching for now)
  const skills = TECH_SKILLS.filter(skill => 
    normalized.includes(skill.toLowerCase())
  );

  // 2. Extract Titles
  const titles = JOB_TITLES.filter(title => 
    normalized.includes(title.toLowerCase())
  );

  // 3. Extract Years of Experience
  // Look for patterns like "5 years", "3+ yrs", "8 years of experience"
  let experience = 0;
  const expMatch = nlpDoc.match("#Value (year|years|yr|yrs)").first().terms();
  if (expMatch.length) {
    const val = parseInt(expMatch.text());
    if (!isNaN(val)) experience = val;
  }

  return {
    skills: [...new Set(skills)],
    experience,
    titles: [...new Set(titles)],
    rawLength: text.length
  };
};

/**
 * Calculates a match score between resume and job entities.
 */
export const calculateLocalMatchScore = (resumeText, job) => {
  const resumeEntities = extractLocalEntities(resumeText);
  const jobDescEntities = extractLocalEntities(job.description || "");
  const jobExplicitSkills = (job.skills || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  
  const jobEntities = {
    skills: [...new Set([...jobExplicitSkills, ...jobDescEntities.skills])],
    title: (job.title || "").toLowerCase()
  };

  // Skill Match (weighted heaviest)
  const matchedSkills = jobEntities.skills.filter(s => 
    resumeEntities.skills.includes(s) || resumeText.toLowerCase().includes(s)
  );
  
  // Skill Match (weighted heavily)
  const matchedSkills = jobEntities.skills.filter(s => 
    resumeEntities.skills.includes(s) || resumeText.toLowerCase().includes(s)
  );
  
  const skillScore = jobEntities.skills.length > 0 
    ? (matchedSkills.length / jobEntities.skills.length) * 60
    : 30; // Baseline if no requirements specified

  // Title/Keyword Match (fuzzy)
  let titleScore = 0;
  const normalizedTitle = jobEntities.title.replace(/[^a-z0-9]/g, " ");
  if (resumeText.toLowerCase().includes(normalizedTitle)) {
    titleScore = 25;
  } else {
    const titleWords = normalizedTitle.split(" ").filter(w => w.length > 3);
    const wordMatches = titleWords.filter(w => resumeText.toLowerCase().includes(w));
    titleScore = titleWords.length > 0 ? (wordMatches.length / titleWords.length) * 20 : 0;
  }

  // Broad Keyword Overlap (Safety net for 0% issues)
  const resumeTokens = new Set(resumeText.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3));
  const jobTokens = job.description?.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3) || [];
  const overlapCount = jobTokens.filter(t => resumeTokens.has(t)).length;
  const overlapRatio = jobTokens.length > 0 ? Math.min(1, overlapCount / 20) : 0; // Cap at 20 tokens for broad match
  const broadMatchScore = overlapRatio * 15;

  // Minimum Baseline Score (If there's ANY overlap or just a valid resume)
  const baseline = resumeText.length > 100 ? 15 : 0;

  const totalScore = Math.min(99, Math.round(baseline + skillScore + titleScore + broadMatchScore));

  const missingSkills = jobEntities.skills.filter(s => !matchedSkills.includes(s));

  return {
    score: totalScore,
    matchedSkills: matchedSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
    missingSkills: missingSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
    summary: `Local Analysis: Matched ${matchedSkills.length}/${jobEntities.skills.length} core requirements identified from the job description and metadata.`
  };
};
