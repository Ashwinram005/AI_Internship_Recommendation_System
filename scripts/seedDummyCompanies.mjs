import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
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

const companies = [
  { name: "LumenBridge Tech", slug: "lumenbridge", email: "hr.lumenbridge@smallco.dev", industry: "SaaS" },
  { name: "ByteNest Systems", slug: "bytenest", email: "careers.bytenest@smallco.dev", industry: "Platform Engineering" },
  { name: "NexaOrbit Labs", slug: "nexaorbit", email: "talent.nexaorbit@smallco.dev", industry: "AI Products" },
  { name: "UrbanStack Digital", slug: "urbanstack", email: "jobs.urbanstack@smallco.dev", industry: "Digital Commerce" },
  { name: "VerityPulse Data", slug: "veritypulse", email: "hiring.veritypulse@smallco.dev", industry: "Data Analytics" },
  { name: "CloudSprout Works", slug: "cloudsprout", email: "team.cloudsprout@smallco.dev", industry: "Cloud Consulting" },
  { name: "SignalMint Solutions", slug: "signalmint", email: "talent.signalmint@smallco.dev", industry: "Enterprise Automation" },
  { name: "PrismForge Innovations", slug: "prismforge", email: "careers.prismforge@smallco.dev", industry: "Fintech" },
  { name: "AsterGrid Networks", slug: "astergrid", email: "jobs.astergrid@smallco.dev", industry: "Network Platforms" },
  { name: "CivicLoop Software", slug: "civicloop", email: "hiring.civicloop@smallco.dev", industry: "GovTech" },
  { name: "CoreHarbor AI", slug: "coreharbor", email: "talent.coreharbor@smallco.dev", industry: "AI Hiring Tools" },
  { name: "OrbitQuill Tech", slug: "orbitquill", email: "jobs.orbitquill@smallco.dev", industry: "Developer Tools" },
];

const roleTemplates = [
  {
    title: "Frontend Engineer",
    type: "job",
    skills: "React, TypeScript, Tailwind CSS, REST APIs, Testing",
    description:
      "We are hiring a Frontend Engineer to build high-quality user experiences across our core platform.\n\nResponsibilities:\n- Build reusable React components and production-ready UI modules.\n- Collaborate with product and design to deliver responsive interfaces.\n- Optimize performance, accessibility, and maintainability of web apps.\n\nRequired:\n- Strong React and TypeScript fundamentals.\n- Experience integrating REST APIs and handling async state.\n- Practical UI testing experience with modern tooling.\n\nPreferred:\n- Familiarity with design systems and component libraries.\n- Experience with analytics instrumentation.",
  },
  {
    title: "Backend Engineer",
    type: "job",
    skills: "Node.js, Express, Firestore, API Design, Docker",
    description:
      "Join our backend team to design services that power candidate matching and hiring workflows.\n\nResponsibilities:\n- Build and maintain scalable APIs and background processes.\n- Model data contracts for jobs, applications, and analytics.\n- Improve reliability, error handling, and observability.\n\nRequired:\n- Strong Node.js and API design experience.\n- Experience with NoSQL data modeling and production deployments.\n- Ability to write maintainable, tested server-side code.\n\nPreferred:\n- Experience with Firebase or cloud-native architectures.\n- Familiarity with CI/CD and containerized delivery.",
  },
  {
    title: "AI/ML Engineer",
    type: "job",
    skills: "Python, NLP, LLM Prompting, Model Evaluation, FastAPI",
    description:
      "We are looking for an AI/ML Engineer to improve ranking quality, scoring explainability, and model evaluation.\n\nResponsibilities:\n- Design prompt pipelines for resume-job matching.\n- Build evaluation datasets and monitor score consistency.\n- Partner with product to ship measurable AI improvements.\n\nRequired:\n- Hands-on experience with NLP or LLM applications.\n- Strong Python and API integration skills.\n- Ability to evaluate model outputs with clear metrics.\n\nPreferred:\n- Prior experience in HR Tech or recommendation systems.\n- Experience with experiment tracking workflows.",
  },
  {
    title: "Data Analyst",
    type: "job",
    skills: "SQL, Python, Power BI, Data Modeling, Dashboarding",
    description:
      "We need a Data Analyst to support business and hiring decisions with reliable dashboards and reporting.\n\nResponsibilities:\n- Build weekly dashboards for hiring funnel and conversion metrics.\n- Conduct deep-dive analysis for role performance and sourcing quality.\n- Partner with operations teams on KPI definitions.\n\nRequired:\n- Strong SQL and data analysis fundamentals.\n- Experience creating stakeholder-friendly dashboards.\n- Ability to communicate insights clearly to non-technical teams.\n\nPreferred:\n- Experience with event-level product analytics.\n- Exposure to A/B testing and statistical interpretation.",
  },
  {
    title: "Product Intern - Hiring Intelligence",
    type: "internship",
    skills: "Product Thinking, Market Research, Communication, Figma, Analytics",
    description:
      "This internship is ideal for students interested in product development for AI-enabled hiring workflows.\n\nResponsibilities:\n- Support feature discovery and user feedback synthesis.\n- Prepare requirement docs and simple user journey maps.\n- Track experiment outcomes with the product team.\n\nRequired:\n- Strong communication and documentation ability.\n- Interest in AI products and user-centric design.\n- Ability to work in fast iteration cycles.\n\nPreferred:\n- Prior internship or campus project in product/design domain.\n- Basic familiarity with analytics tools.",
  },
  {
    title: "Campus Community Lead",
    type: "internship",
    skills: "Campus Outreach, Community Building, Event Marketing, Communication, CRM",
    description:
      "We are hiring a Campus Community Lead to build student engagement and awareness across engineering colleges.\n\nResponsibilities:\n- Coordinate campus events and student ambassador programs.\n- Build partnerships with coding clubs and AI communities.\n- Track event conversion and lead quality in CRM workflows.\n\nRequired:\n- Active AI/ML/Tech network on campus.\n- Member or leader of coding clubs, AI societies, or student communities.\n- Ability to demonstrate credible campus reach and community access.\n\nPreferred:\n- Prior experience in student chapters or hackathon organizing.\n- Strong social and written communication.",
  },
  {
    title: "Cloud Operations Engineer",
    type: "job",
    skills: "AWS, Terraform, CI/CD, Linux, Monitoring",
    description:
      "Build resilient cloud infrastructure for our production platform and data workflows.\n\nResponsibilities:\n- Automate infrastructure provisioning with IaC patterns.\n- Improve deployment reliability and rollback confidence.\n- Build observability and incident response tooling.\n\nRequired:\n- Hands-on cloud operations experience in production.\n- Strong Linux and automation fundamentals.\n- Experience with CI/CD pipelines and release practices.\n\nPreferred:\n- Security-first infrastructure mindset.\n- Experience with performance tuning and cost optimization.",
  },
  {
    title: "QA Automation Engineer",
    type: "job",
    skills: "Playwright, API Testing, CI Pipelines, Test Strategy, JavaScript",
    description:
      "Improve release confidence by expanding automated test coverage across frontend and API layers.\n\nResponsibilities:\n- Build and maintain robust test suites for critical workflows.\n- Define regression strategy for candidate and company portals.\n- Collaborate with developers to prevent production defects.\n\nRequired:\n- Practical experience in web and API automation frameworks.\n- Strong debugging and defect triage skills.\n- Ability to design maintainable test architecture.\n\nPreferred:\n- Experience in high-change product environments.\n- Performance and reliability testing exposure.",
  },
  {
    title: "Growth Marketing Intern",
    type: "internship",
    skills: "Content Marketing, Social Campaigns, SEO, Analytics, Communication",
    description:
      "Support brand growth initiatives for job seeker and employer acquisition campaigns.\n\nResponsibilities:\n- Execute weekly content and campaign plans across digital channels.\n- Assist with landing page experiments and campaign tracking.\n- Prepare performance snapshots for marketing reviews.\n\nRequired:\n- Strong written communication and campaign execution interest.\n- Basic understanding of digital analytics and conversion funnels.\n- Ability to coordinate with design and product teams.\n\nPreferred:\n- Prior internship or campus project in marketing.\n- Working familiarity with lightweight SEO practices.",
  },
  {
    title: "Data Science Intern",
    type: "internship",
    skills: "Python, Pandas, Statistics, Visualization, SQL",
    description:
      "Join the data science team to improve candidate-job recommendation quality using real platform data.\n\nResponsibilities:\n- Build analysis notebooks for recommendation insights.\n- Evaluate model behavior and create quality reports.\n- Support feature engineering and candidate ranking experiments.\n\nRequired:\n- Strong Python fundamentals and comfort with tabular data.\n- Understanding of core statistics and evaluation metrics.\n- Clear analytical communication and documentation ability.\n\nPreferred:\n- Machine learning coursework or related projects.\n- Familiarity with SQL-based data access.",
  },
  {
    title: "Developer Relations Intern",
    type: "internship",
    skills: "Community Engagement, Technical Writing, Events, GitHub, Public Speaking",
    description:
      "Drive developer community engagement through events, content, and product education.\n\nResponsibilities:\n- Organize workshops and student developer events.\n- Create technical guides and demo assets.\n- Gather developer feedback and share product insights.\n\nRequired:\n- Active involvement in tech communities or coding clubs.\n- Strong communication and presentation confidence.\n- Ability to translate technical topics for mixed audiences.\n\nPreferred:\n- Prior event hosting or hackathon mentorship experience.\n- Interest in developer tooling ecosystems.",
  },
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

const pick = (items, seed) => items[seed % items.length];

const enrichTemplateDescription = ({ template, company, companyIndex, slotIndex }) => {
  const seed = companyIndex * 17 + slotIndex * 13;
  const level = pick(levels, seed);
  const mode = pick(workModes, seed + 2);
  const outcome = pick(outcomes, seed + 5);
  const collaboration = pick(collaborationGroups, seed + 8);
  const benefit = pick(benefitLines, seed + 11);

  const uniqueCompanyContext =
    template.type === "internship"
      ? `${company.name} is expanding campus and early-career programs in ${company.industry}.`
      : `${company.name} is scaling core platform capabilities in ${company.industry}.`;

  return `${template.description}\n\nRole Level: ${level}\nWork Mode: ${mode}\nBusiness Outcome: Deliver initiatives that ${outcome}.\nCollaboration: Work closely with ${collaboration}.\nCompany Context: ${uniqueCompanyContext}\nWhy Join: ${benefit}.`;
};

const buildJobsForCompany = (companyIndex) => {
  const jobsPerCompany = Number.parseInt(process.env.JOBS_PER_COMPANY || "10", 10);
  const safeJobsPerCompany = Number.isFinite(jobsPerCompany)
    ? Math.max(6, Math.min(20, jobsPerCompany))
    : 10;

  const jobTemplates = roleTemplates.filter((item) => item.type === "job");
  const internshipTemplates = roleTemplates.filter(
    (item) => item.type === "internship",
  );

  const selected = [];
  for (let i = 0; i < safeJobsPerCompany; i += 1) {
    const useInternship = i % 2 === 1;
    const pool = useInternship ? internshipTemplates : jobTemplates;
    const template = pool[(companyIndex + i) % pool.length];
    const levelPrefix = pick(levels, companyIndex + i);
    const roleLabel = template.type === "internship" ? "Internship" : "Role";

    selected.push({
      type: template.type,
      title:
        template.type === "internship"
          ? `${template.title} (${roleLabel})`
          : `${levelPrefix} ${template.title}`,
      skills: template.skills,
      description: enrichTemplateDescription({
        template,
        company: companies[companyIndex],
        companyIndex,
        slotIndex: i,
      }),
      deadline: futureDate(25 + companyIndex * 2 + i * 7),
    });
  }
  return selected;
};

const run = async () => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const seedBatchId = `company_seed_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const credentialRows = [];

  for (let i = 0; i < companies.length; i += 1) {
    const company = companies[i];
    const password = company.email;
    let userCredential = null;
    let accountCreated = false;

    try {
      userCredential = await createUserWithEmailAndPassword(auth, company.email, password);
      accountCreated = true;
    } catch (error) {
      if (error?.code === "auth/email-already-in-use") {
        try {
          userCredential = await signInWithEmailAndPassword(auth, company.email, password);
        } catch {
          console.warn(`Skipping ${company.email}: account exists with a different password.`);
          continue;
        }
      } else {
        console.warn(`Skipping ${company.email}: ${error?.message || "unknown auth error"}`);
        continue;
      }
    }

    const uid = userCredential.user.uid;

    await setDoc(
      doc(db, "companies", uid),
      {
        userId: uid,
        role: "company",
        name: company.name,
        email: company.email,
        industry: company.industry,
        website: `https://${company.slug}.smallco.dev`,
        about: `${company.name} is a growth-stage ${company.industry} company hiring for product and engineering teams.`,
        photoURL: "",
        seedBatchId,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    const jobs = buildJobsForCompany(i);
    let jobsCreated = 0;

    for (const job of jobs) {
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
    }

    credentialRows.push({
      companyName: company.name,
      email: company.email,
      password,
      uid,
      jobsCreated,
      accountCreated,
    });

    await signOut(auth);
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

  console.log(`Seed completed. Companies ready: ${credentialRows.length}`);
  console.log(`Credentials file: ${credentialsOutputPath}`);
};

run().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
