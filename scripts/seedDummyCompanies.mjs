import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

/**
 * Seed Firestore with dummy companies + jobs (tech + non-tech roles in roleCatalog).
 * Re-runs append: each invocation gets a unique SEED_RUN_ID (or set SEED_RUN_ID) so
 * company emails/slugs and seedBatchId do not collide with existing documents.
 *
 * Env: COMPANY_COUNT, COMPANY_COUNT_MIN, JOBS_PER_COMPANY, SEED_RUN_ID,
 *      SEED_WRITER_EMAIL, SEED_WRITER_PASSWORD, SEED_CREATE_AUTH_USERS
 *
 * Run: npm run seed:companies
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const envFilePath = path.join(projectRoot, ".env");
const credentialsOutputPath = path.join(
  projectRoot,
  "scripts",
  "generated",
  "dummy-company-credentials.json",
);

const parseEnvFile = (targetPath) => {
  const env = {};
  const raw = fs.readFileSync(targetPath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
};

const env = parseEnvFile(envFilePath);

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** Lower bound defaults to 1 so you can append a small batch (set COMPANY_COUNT_MIN=50 for legacy “bulk only” behavior). */
const COMPANY_COUNT_MIN = Number.parseInt(process.env.COMPANY_COUNT_MIN || "1", 10);
const COMPANY_COUNT_MAX = 100;

/** Unique per run so new companies/jobs append alongside existing Firestore data (stable inbox: set SEED_RUN_ID=mybatch). */
const seedRunId = (process.env.SEED_RUN_ID || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`).replace(
  /[^a-z0-9]/gi,
  "",
);

const companyNamePrefixes = [
  "Lumen", "Byte", "Nexa", "Urban", "Verity", "Cloud", "Signal", "Prism", "Aster", "Civic",
  "Core", "Orbit", "Nova", "Vector", "Echo", "Quantum", "Nimbus", "Aquila", "Hexa", "Pixel",
  "Terra", "Fusion", "Zenith", "Vertex", "Vivid", "Summit", "Beacon", "Delta", "Pulse", "Atlas",
  "Coda", "Matrix", "Bright", "Swift", "Solar", "Iris", "Argo", "Strata", "Kite", "Aurora",
];

const companyNameSuffixes = [
  "Bridge", "Nest", "Orbit", "Stack", "Pulse", "Sprout", "Mint", "Forge", "Grid", "Loop",
  "Harbor", "Quill", "Labs", "Works", "Systems", "Dynamics", "Networks", "Digital", "Innovations",
  "Technologies", "Ventures", "Analytics", "Solutions", "Platform", "Studio", "Collective",
];

const industryCatalog = [
  "SaaS", "AI Products", "Data Analytics", "Developer Tools", "Fintech", "HealthTech", "EdTech",
  "GovTech", "Cybersecurity", "Cloud Consulting", "Digital Commerce", "Enterprise Automation",
  "Workforce Intelligence", "HRTech", "MarTech", "Logistics Tech", "Climate Tech", "PropTech",
  "InsurTech", "Retail Technology", "Professional Services", "Healthcare Administration", "Media",
  "Hospitality", "Consumer Goods", "Non-profit", "Real Estate Services", "Industrial Operations",
];

const recruiterHandles = [
  "hr", "careers", "talent", "jobs", "hiring", "people", "recruiting", "team",
];

const requestedCompanyCount = Number.parseInt(process.env.COMPANY_COUNT || "60", 10);
const targetCompanyCount = Number.isFinite(requestedCompanyCount)
  ? Math.max(COMPANY_COUNT_MIN, Math.min(COMPANY_COUNT_MAX, requestedCompanyCount))
  : 60;

const makeSlug = (input) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const generateCompanies = (count, runId) => {
  const usedSlugs = new Set();
  const results = [];

  for (let i = 0; i < count; i += 1) {
    const prefix = companyNamePrefixes[i % companyNamePrefixes.length];
    const suffix = companyNameSuffixes[(i * 3 + 7) % companyNameSuffixes.length];
    const industry = industryCatalog[(i * 5 + 11) % industryCatalog.length];
    const handle = recruiterHandles[(i * 7 + 3) % recruiterHandles.length];

    const baseName = `${prefix}${suffix}`;
    let slug = makeSlug(baseName);

    if (usedSlugs.has(slug)) {
      slug = `${slug}-${String(i + 1).padStart(2, "0")}`;
    }

    usedSlugs.add(slug);
    const displayName = `${baseName} ${["Tech", "Labs", "Systems", "Works", "Digital"][i % 5]}`;
    const uniqueSlug = `${slug}-r${runId}`;

    results.push({
      name: displayName,
      slug: uniqueSlug,
      email: `${handle}.${uniqueSlug}@smallco.dev`,
      industry,
    });
  }

  return results;
};

const companies = generateCompanies(targetCompanyCount, seedRunId);

const roleCatalog = [
  { baseTitle: "Frontend Engineer", type: "job", skills: "React, TypeScript, CSS Architecture, API Integration, Testing" },
  { baseTitle: "Backend Engineer", type: "job", skills: "Node.js, API Design, Firestore, Caching, Observability" },
  { baseTitle: "Full Stack Engineer", type: "job", skills: "React, Node.js, SQL, CI/CD, System Design" },
  { baseTitle: "AI/ML Engineer", type: "job", skills: "Python, NLP, LLM Evaluation, Prompt Engineering, FastAPI" },
  { baseTitle: "Data Engineer", type: "job", skills: "ETL, SQL, Python, Data Modeling, Orchestration" },
  { baseTitle: "Data Analyst", type: "job", skills: "SQL, BI Dashboards, KPI Design, Python, Storytelling" },
  { baseTitle: "Product Manager", type: "job", skills: "Roadmapping, Discovery, Stakeholder Alignment, Analytics, Experimentation" },
  { baseTitle: "DevOps Engineer", type: "job", skills: "Terraform, CI/CD, Cloud Infrastructure, Linux, Monitoring" },
  { baseTitle: "QA Automation Engineer", type: "job", skills: "Playwright, API Testing, Regression Strategy, CI Pipelines, JavaScript" },
  { baseTitle: "Security Engineer", type: "job", skills: "Threat Modeling, IAM, Secure SDLC, Incident Response, AppSec" },
  { baseTitle: "Mobile Engineer", type: "job", skills: "React Native, Performance, Mobile UX, API Integration, Release Management" },
  { baseTitle: "Platform Engineer", type: "job", skills: "Kubernetes, Internal Tooling, Reliability, Networking, Automation" },
  { baseTitle: "Site Reliability Engineer", type: "job", skills: "SLOs, Incident Management, Reliability, Capacity Planning, Monitoring" },
  { baseTitle: "Business Analyst", type: "job", skills: "Process Mapping, Requirements, Reporting, Stakeholder Communication, SQL" },
  { baseTitle: "Technical Writer", type: "job", skills: "Documentation, Developer Guides, Information Architecture, APIs, Editorial QA" },
  { baseTitle: "Product Design Intern", type: "internship", skills: "UX Research, Figma, Prototyping, Usability Testing, Design Systems" },
  { baseTitle: "Data Science Intern", type: "internship", skills: "Python, Statistics, Visualization, SQL, Experiment Analysis" },
  { baseTitle: "Growth Marketing Intern", type: "internship", skills: "Campaigns, SEO, Content Ops, Analytics, Communication" },
  { baseTitle: "Developer Relations Intern", type: "internship", skills: "Community Building, Technical Writing, Events, Demos, Social Outreach" },
  { baseTitle: "Campus Community Intern", type: "internship", skills: "Campus Outreach, Partnerships, Event Marketing, CRM, Storytelling" },
  { baseTitle: "Product Operations Intern", type: "internship", skills: "Ops Analytics, Documentation, Workflow Design, Communication, Tooling" },
  { baseTitle: "Recruiting Operations Intern", type: "internship", skills: "Candidate Coordination, ATS Management, Reporting, Stakeholder Support, Process Design" },
  // Non-tech / business roles (HR, GTM, finance, operations — inlined for a single seed file)
  { baseTitle: "HR Generalist", type: "job", category: "non-tech", skills: "Employee Relations, HRIS, Onboarding, Policy, Compliance, ER Case Management" },
  { baseTitle: "HR Business Partner", type: "job", category: "non-tech", skills: "Workforce Planning, Coaching Managers, Change Management, Labor Awareness, HR Metrics" },
  { baseTitle: "Talent Acquisition Specialist", type: "job", category: "non-tech", skills: "Full-Cycle Recruiting, Sourcing, Interview Design, ATS, Employer Branding" },
  { baseTitle: "Payroll and Benefits Administrator", type: "job", category: "non-tech", skills: "Payroll Processing, Benefits Administration, Audits, Vendor Coordination, HRIS Data" },
  { baseTitle: "Learning and Development Specialist", type: "job", category: "non-tech", skills: "Training Design, Facilitation, LMS, Needs Analysis, Program Evaluation" },
  { baseTitle: "Office Manager", type: "job", category: "non-tech", skills: "Facilities Coordination, Vendor Management, Scheduling, Procurement, Front-Office Operations" },
  { baseTitle: "Executive Assistant", type: "job", category: "non-tech", skills: "Calendar Management, Travel, Confidential Correspondence, Board Prep, Expense Reporting" },
  { baseTitle: "Marketing Manager", type: "job", category: "non-tech", skills: "Campaign Strategy, Brand, Budgeting, Agency Management, Performance Reporting" },
  { baseTitle: "Content Strategist", type: "job", category: "non-tech", skills: "Editorial Calendar, SEO Basics, Copy Direction, Analytics, Stakeholder Interviews" },
  { baseTitle: "Social Media Specialist", type: "job", category: "non-tech", skills: "Community Management, Content Production, Paid Social, Analytics, Crisis Comms Awareness" },
  { baseTitle: "Account Executive", type: "job", category: "non-tech", skills: "Pipeline Management, Discovery, Proposals, CRM Hygiene, Forecasting" },
  { baseTitle: "Sales Development Representative", type: "job", category: "non-tech", skills: "Outbound Prospecting, Qualification, Sequencing, CRM, Objection Handling" },
  { baseTitle: "Customer Success Manager", type: "job", category: "non-tech", skills: "Onboarding, QBRs, Renewals, Health Scoring, Cross-Functional Escalation" },
  { baseTitle: "Financial Analyst", type: "job", category: "non-tech", skills: "FP&A, Modeling, Variance Analysis, Excel, Executive Reporting" },
  { baseTitle: "Staff Accountant", type: "job", category: "non-tech", skills: "GL, Month-End Close, Reconciliations, GAAP Awareness, AP/AR Support" },
  { baseTitle: "Operations Coordinator", type: "job", category: "non-tech", skills: "Process Documentation, Cross-Functional Projects, Reporting, Vendor Liaison, Inventory Basics" },
  { baseTitle: "Supply Chain Analyst", type: "job", category: "non-tech", skills: "Demand Planning, Supplier Metrics, Logistics Coordination, Excel, ERP Data" },
  { baseTitle: "Legal Assistant", type: "job", category: "non-tech", skills: "Contract Administration, Docketing, Research Support, Filing, Confidentiality" },
  { baseTitle: "Corporate Communications Specialist", type: "job", category: "non-tech", skills: "Internal Comms, Press Support, Messaging, Stakeholder Alignment, Issues Management" },
  { baseTitle: "Facilities Coordinator", type: "job", category: "non-tech", skills: "Workplace Safety, Access Systems, Maintenance Tickets, Vendor SLAs, Events Setup" },
  { baseTitle: "Retail Store Manager", type: "job", category: "non-tech", skills: "Staff Scheduling, P&L Basics, Customer Experience, Inventory, Loss Prevention" },
  { baseTitle: "Event Coordinator", type: "job", category: "non-tech", skills: "Vendor Sourcing, Run-of-Show, Budget Tracking, Registration, On-Site Logistics" },
  { baseTitle: "Non-profit Program Coordinator", type: "job", category: "non-tech", skills: "Grant Reporting, Volunteer Management, Community Partnerships, Budget Tracking, Outreach" },
  { baseTitle: "HR Intern", type: "internship", category: "non-tech", skills: "Scheduling, HRIS Data Entry, Employee Questions, Onboarding Support, Documentation" },
  { baseTitle: "Marketing Intern", type: "internship", category: "non-tech", skills: "Content Drafting, Research, Social Scheduling, Analytics Basics, Team Collaboration" },
  { baseTitle: "Finance Intern", type: "internship", category: "non-tech", skills: "Excel, Expense Audits, Reporting Support, Data Quality, Attention to Detail" },
  { baseTitle: "Sales Intern", type: "internship", category: "non-tech", skills: "CRM Updates, Lead Research, Outreach Support, Call Notes, Pipeline Hygiene" },
  { baseTitle: "Operations Intern", type: "internship", category: "non-tech", skills: "Process Tracking, Documentation, Meetings Support, Vendor Follow-ups, Reporting" },
];

const futureDate = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
};

const levels = ["Trainee", "Junior", "Mid-Level", "Senior", "Lead"];
const workModes = ["Remote", "Hybrid", "On-site"];
const outcomes = [
  "reduce application processing time by 30%",
  "improve candidate quality conversion by 18%",
  "increase recruiter productivity through automation",
  "improve hiring funnel transparency for stakeholders",
  "improve recommendation precision and fairness",
];
const collaborationGroups = [
  "product managers and design leads",
  "recruiting operations and engineering teams",
  "data analysts and AI engineers",
  "platform and quality engineering teams",
  "customer success and implementation teams",
];
const benefitLines = [
  "learning budget and structured mentorship program",
  "flexible work schedule with high ownership",
  "clear career growth framework and review cycles",
  "access to production-grade tooling and workflows",
  "cross-functional exposure across product and go-to-market teams",
];

const specializationTags = [
  "Hiring Intelligence", "Workflow Automation", "Candidate Experience", "Recruiter Productivity", "Decision Intelligence",
  "Platform Reliability", "Data Quality", "Applied AI", "Marketplace Growth", "Talent Operations",
];

const responsibilityPool = [
  "design and ship production features with measurable impact",
  "improve reliability and observability of business-critical workflows",
  "partner with product and design to shorten delivery cycles",
  "translate ambiguous requirements into scalable implementations",
  "raise engineering quality through testing and standards",
  "create feedback loops to improve user outcomes continuously",
  "optimize end-to-end candidate and employer experience",
];

const requiredPool = [
  "strong fundamentals in system design and maintainable code",
  "ability to debug complex issues across service boundaries",
  "clear written and verbal communication for cross-team work",
  "hands-on experience with modern developer workflows",
  "ownership mindset and bias for pragmatic execution",
  "comfort working with data-informed product decisions",
];

const preferredPool = [
  "experience shipping in fast iteration environments",
  "background in hiring, talent, or marketplace domains",
  "familiarity with cloud-native architectures",
  "exposure to AI-assisted product features",
  "ability to mentor peers and improve team velocity",
  "experience instrumenting metrics and dashboards",
];

const nonTechOutcomes = [
  "improve employee experience and people-program quality",
  "strengthen pipeline visibility and forecast accuracy",
  "reduce operational friction for internal teams",
  "improve customer satisfaction and retention signals",
  "raise brand consistency across channels and regions",
  "tighten compliance and audit readiness",
];

const nonTechCollaborationGroups = [
  "finance and accounting partners",
  "HR business partners and managers",
  "sales leadership and revenue operations",
  "marketing and communications teams",
  "legal and corporate affairs",
  "facilities and workplace services",
];

const nonTechBenefitLines = [
  "mentorship and structured learning in a people-first culture",
  "clear goals with regular coaching and feedback",
  "exposure to cross-functional initiatives and senior leaders",
  "tools and systems that reduce administrative busywork",
  "flexible arrangements where the role allows",
];

const nonTechSpecializationTags = [
  "People Programs",
  "Go-To-Market",
  "Finance Operations",
  "Workplace Experience",
  "Customer Lifecycle",
  "Brand and Communications",
];

const nonTechResponsibilityPool = [
  "own day-to-day execution with strong attention to detail and deadlines",
  "build trusted relationships with stakeholders and external partners",
  "maintain accurate records, trackers, and operational documentation",
  "surface insights from data and qualitative signals to guide decisions",
  "coordinate cross-functional workflows and follow-ups",
  "represent the team professionally in meetings and written communication",
];

const nonTechRequiredPool = [
  "clear written and verbal communication",
  "organized approach to multi-tasking and prioritization",
  "comfort with spreadsheets, ticketing systems, or CRM tools as relevant",
  "sound judgment on confidential or sensitive information",
  "collaborative mindset with remote and in-person stakeholders",
];

const nonTechPreferredPool = [
  "prior experience in a similar industry or function",
  "familiarity with modern workplace and people tools",
  "experience supporting executives or large programs",
  "bilingual or regional market experience",
  "background in regulated or audited environments",
];

const pick = (items, seed) => items[seed % items.length];

const enrichTemplateDescription = ({ template, company, companyIndex, slotIndex }) => {
  const seed = companyIndex * 17 + slotIndex * 13;
  const level = pick(levels, seed);
  const mode = pick(workModes, seed + 2);

  if (template.category === "non-tech") {
    const outcome = pick(nonTechOutcomes, seed + 5);
    const collaboration = pick(nonTechCollaborationGroups, seed + 8);
    const benefit = pick(nonTechBenefitLines, seed + 11);
    const specialization = pick(nonTechSpecializationTags, seed + 3);
    const responsibilityA = pick(nonTechResponsibilityPool, seed + 17);
    const responsibilityB = pick(nonTechResponsibilityPool, seed + 19);
    const requiredA = pick(nonTechRequiredPool, seed + 23);
    const requiredB = pick(nonTechRequiredPool, seed + 29);
    const preferredA = pick(nonTechPreferredPool, seed + 31);
    const preferredB = pick(nonTechPreferredPool, seed + 37);
    const uniqueCompanyContext =
      template.type === "internship"
        ? `${company.name} is growing early-career programs in ${company.industry}.`
        : `${company.name} is scaling business and operations in ${company.industry}.`;

    return [
      `Join ${company.name} as a ${template.title} with focus on ${specialization}.`,
      "",
      "Responsibilities:",
      `- ${responsibilityA}.`,
      `- ${responsibilityB}.`,
      `- Help the team ${outcome}.`,
      "",
      "Required:",
      `- ${requiredA}.`,
      `- ${requiredB}.`,
      `- Core strengths in: ${template.skills}.`,
      "",
      "Preferred:",
      `- ${preferredA}.`,
      `- ${preferredB}.`,
      "",
      `Role Level: ${level}`,
      `Work Mode: ${mode}`,
      `Collaboration: Partner closely with ${collaboration}.`,
      `Company Context: ${uniqueCompanyContext}`,
      `Why Join: ${benefit}.`,
    ].join("\n");
  }

  const outcome = pick(outcomes, seed + 5);
  const collaboration = pick(collaborationGroups, seed + 8);
  const benefit = pick(benefitLines, seed + 11);
  const specialization = pick(specializationTags, seed + 3);

  const responsibilityA = pick(responsibilityPool, seed + 17);
  const responsibilityB = pick(responsibilityPool, seed + 19);
  const requiredA = pick(requiredPool, seed + 23);
  const requiredB = pick(requiredPool, seed + 29);
  const preferredA = pick(preferredPool, seed + 31);
  const preferredB = pick(preferredPool, seed + 37);

  const uniqueCompanyContext =
    template.type === "internship"
      ? `${company.name} is expanding campus and early-career programs in ${company.industry}.`
      : `${company.name} is scaling core platform capabilities in ${company.industry}.`;

  return [
    `Join ${company.name} as a ${template.title} focused on ${specialization}.`,
    "",
    "Responsibilities:",
    `- ${responsibilityA}.`,
    `- ${responsibilityB}.`,
    `- Deliver initiatives that ${outcome}.`,
    "",
    "Required:",
    `- ${requiredA}.`,
    `- ${requiredB}.`,
    `- Practical strength in: ${template.skills}.`,
    "",
    "Preferred:",
    `- ${preferredA}.`,
    `- ${preferredB}.`,
    "",
    `Role Level: ${level}`,
    `Work Mode: ${mode}`,
    `Collaboration: Work closely with ${collaboration}.`,
    `Company Context: ${uniqueCompanyContext}`,
    `Why Join: ${benefit}.`,
  ].join("\n");
};

const buildJobsForCompany = (companyIndex) => {
  const jobsPerCompany = Number.parseInt(process.env.JOBS_PER_COMPANY || "10", 10);
  const safeJobsPerCompany = Number.isFinite(jobsPerCompany)
    ? Math.max(6, Math.min(20, jobsPerCompany))
    : 10;

  const selected = [];
  for (let i = 0; i < safeJobsPerCompany; i += 1) {
    const template = roleCatalog[(companyIndex * 11 + i * 7) % roleCatalog.length];
    const levelPrefix = pick(levels, companyIndex + i * 3);
    const tagPool = template.category === "non-tech" ? nonTechSpecializationTags : specializationTags;
    const specialization = pick(tagPool, companyIndex * 2 + i * 5);
    const roleLabel = template.type === "internship" ? "Internship" : "Role";
    const enrichedTitle =
      template.type === "internship"
        ? `${template.baseTitle} (${specialization})`
        : `${levelPrefix} ${template.baseTitle} - ${specialization}`;

    const enrichedTemplate = {
      ...template,
      title: enrichedTitle,
    };

    selected.push({
      type: enrichedTemplate.type,
      title:
        enrichedTemplate.type === "internship"
          ? `${enrichedTemplate.title} (${roleLabel})`
          : enrichedTemplate.title,
      skills: enrichedTemplate.skills,
      description: enrichTemplateDescription({
        template: enrichedTemplate,
        company: companies[companyIndex],
        companyIndex,
        slotIndex: i,
      }),
      deadline: futureDate(25 + companyIndex * 2 + i * 7),
    });
  }
  return selected;
};

const withTimeout = async (promise, ms, label) => {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const run = async () => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const seedWriterEmail = env.SEED_WRITER_EMAIL || "hr.lumenbridge@smallco.dev";
  const seedWriterPassword = env.SEED_WRITER_PASSWORD || seedWriterEmail;
  const createAuthUsers = String(env.SEED_CREATE_AUTH_USERS || "false") === "true";
  try {
    await signInWithEmailAndPassword(auth, seedWriterEmail, seedWriterPassword);
  } catch {
    // The script can still proceed if individual company auth creation/sign-in works.
  }

  const seedBatchId = `company_seed_${seedRunId}_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const credentialRows = [];

  for (let i = 0; i < companies.length; i += 1) {
    const company = companies[i];
    const password = createAuthUsers ? company.email : null;
    let userCredential = null;
    let accountCreated = false;
    let authStatus = "seed-writer-only";

    if (createAuthUsers) {
      try {
        userCredential = await createUserWithEmailAndPassword(auth, company.email, password);
        accountCreated = true;
        authStatus = "created";
      } catch (error) {
        if (error?.code === "auth/email-already-in-use") {
          try {
            userCredential = await signInWithEmailAndPassword(auth, company.email, password);
            authStatus = "signed-in-existing";
          } catch {
            authStatus = "auth-skip-password-mismatch";
          }
        } else {
          authStatus = `auth-fallback-${error?.code || "unknown"}`;
        }
      }
    }

    const uid = userCredential?.user?.uid || doc(collection(db, "companies")).id;

    try {
      await setDoc(
        doc(db, "companies", uid),
        {
          userId: uid,
          role: "company",
          name: company.name,
          email: company.email,
          industry: company.industry,
          website: `https://${company.slug}.smallco.dev`,
          about: `${company.name} is a growth-stage ${company.industry} company hiring across technology, business operations, and corporate functions.`,
          photoURL: "",
          seedBatchId,
          authStatus,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      console.warn(`Skipping company profile write for ${company.email}: ${error?.message || "write error"}`);
      continue;
    }

    const jobs = buildJobsForCompany(i);
    let jobsCreated = 0;

    for (const job of jobs) {
      try {
        await addDoc(collection(db, "jobs"), {
          ...job,
          company: company.name,
          companyId: uid,
          status: "active",
          active: true,
          seedBatchId,
          createdAt: serverTimestamp(),
        });
        jobsCreated += 1;
      } catch (error) {
        console.warn(`Job write skipped for ${company.email}: ${error?.message || "write error"}`);
      }
    }

    credentialRows.push({
      companyName: company.name,
      email: company.email,
      password,
      uid,
      jobsCreated,
      accountCreated,
      authStatus,
    });
  }

  fs.mkdirSync(path.dirname(credentialsOutputPath), { recursive: true });
  fs.writeFileSync(
    credentialsOutputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        seedBatchId,
        projectId: firebaseConfig.projectId,
        companies: credentialRows,
      },
      null,
      2,
    ),
  );

  try {
    await signOut(auth);
  } catch {
    // no-op
  }

  await deleteApp(app);

  console.log(`Seed completed. Run id: ${seedRunId}. Companies created: ${credentialRows.length}`);
  console.log(`Credentials file: ${credentialsOutputPath}`);
};

run().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
