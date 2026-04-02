# GetLanded AI - Internship Recommendation Engine

GetLanded is a professional hiring and candidate platform that utilizes advanced AI to match candidates with the right roles. Built with a modern technology stack, it ensures a fast, secure, and highly intelligent recruitment workflow.

## 🛠️ Technology Stack Breakdown

This application is powered by **React**, **Firebase**, optional **Groq AI**, and a **local spaCy skill-extractor** service. Here is how each piece is used in the recommendation engine.

---

### 1. React (Frontend & User Interface)

React (with Vite) serves as the structural foundation of the platform.

* **Role-Based Workflows**: React renders different dashboard experiences for Candidates, Employers, and Admins (`UserLayout`, `CompanyLayout`, `AdminLayout`) using `react-router-dom` for client-side navigation.
* **State Management & Context**: React Context (`AuthContext`, `VoiceContext`) holds authentication and voice state globally.
* **UI**: Tailwind CSS, Lucide icons, and a glass-style aesthetic.
* **Interactive Data Views**: Job lists, job details, and `JobMatcher.jsx` consume AI metadata (scores, matched/missing skills).
* **Document Parsing on the Client**: PDF and DOCX text extraction (`pdfjs-dist`, `mammoth`) runs in the browser before matching.

---

### 2. Firebase (Backend as a Service)

Firebase provides authentication and data storage without a custom Node.js app server.

* **Firebase Authentication**: Email/password and Google OAuth; tokens gate Firestore access.
* **Cloud Firestore**: Collections include `users`, `companies`, `jobs`, `resumes`, and `applications`. Employer views can react to new applications in real time.
* **Security Rules**: `firestore.rules` restrict reads/writes (e.g. users own their resumes and applications; companies see applications for their jobs).
* **Resume storage**: Resume files are stored **in Firestore** as documents (metadata plus base64 payload), not in Firebase Storage. Size and MIME types are validated in `resumeService.js`.

---

### 3. Local Skill NER (spaCy + Hugging Face)

Dynamic skill (and optional role) extraction uses **no hard-coded skill or job-title lists** in the browser. Instead, the app calls a small **Python** service that loads the public model **[amjad-awad/skill-extractor](https://huggingface.co/amjad-awad/skill-extractor)** from the Hub (`huggingface_hub.snapshot_download` + `spacy.load`), matching the model card usage.

* **Server**: `server/skill_extractor_server.py` — FastAPI app exposing `POST /api/extract/batch` with `{ "texts": [...] }`, returning NER-derived `skills`, `role_terms`, and raw `entities` per text.
* **Client**: `src/services/localNerService.js` batches resume and job text, scores overlap with fuzzy skill matching, description/token overlap, and title or role-entity alignment, producing baseline **`matchScore`**, **`matchedSkills`**, **`missingSkills`**, and **`confidence`**.
* **Fallback**: If the Python service is unreachable, the same module falls back to a **lexical-only** score (token overlap) and surfaces that in the summary so you know the NER path did not run.

**Local dev:** after `pip install -r server/requirements.txt`, **`npm run dev`** starts the skill API and Vite together (via **`concurrently`**). **`npm run dev:vite`** is frontend-only; **`npm run skill-server`** runs only Python. Port **8765** is freed first by **`scripts/free-skill-port.mjs`** (override with **`SKILL_EXTRACTOR_PORT`**; keep Vite proxy in sync—see [BACKEND_FRONTEND_CONNECTION.md](./BACKEND_FRONTEND_CONNECTION.md).)

In **local dev**, the app calls **`/skill-api`** and Vite **proxies** to the skill API (default **`http://127.0.0.1:8765`**; override with **`SKILL_EXTRACTOR_PORT`** / **`VITE_SKILL_EXTRACTOR_PROXY_TARGET`**—see `vite.config.js`). Set **`VITE_SKILL_EXTRACTOR_URL`** in `.env` only when you want a direct URL (e.g. deployed API). For production, tighten **`CORS_ORIGINS`** on the Python app.

**Full wiring, env tables, and troubleshooting:** [BACKEND_FRONTEND_CONNECTION.md](./BACKEND_FRONTEND_CONNECTION.md).

### Seeding dummy companies and jobs

`scripts/seedDummyCompanies.mjs` creates companies and **active jobs** (mixed **tech** and **non-tech**: HR, finance, marketing, sales, operations, etc.) in Firestore. Each run uses a unique **`SEED_RUN_ID`** (auto-generated unless you set it) so **new rows append** next to data already in the database.

```bash
npm run seed:companies
```

Optional env (see script header): `COMPANY_COUNT`, `COMPANY_COUNT_MIN`, `JOBS_PER_COMPANY`, `SEED_RUN_ID`, `SEED_WRITER_EMAIL`, `SEED_WRITER_PASSWORD`, `SEED_CREATE_AUTH_USERS`.

---

### 4. Groq AI (Optional Semantic Layer)

When **`VITE_GROQ_API_KEY`** is set, Groq (`llama-3.3-70b-versatile` via the OpenAI-compatible client) refines rankings using structured JSON: scores, matched/missing skills, and short summaries. The **local NER baseline** from the previous section is still computed first (batched per matcher run) and merged with Groq output in `aiMatchingService.js` so you stay resilient if the LLM is unavailable.

---

## 🚀 How They Work Together (The Flow)

1. A **candidate** uploads a resume; **React** parses PDF/DOCX text and **Firestore** stores the resume document.
2. On **AI Matcher** (or employer-side ranking), the app builds text blobs for the resume and each visible job (or each applicant vs one job).
3. **`extractSkillModelBatch`** calls the **Python NER API**; **`scoreFromExtracts`** turns aligned skills and text signals into ranked local scores (or lexical fallback if the API is down).
4. If **Groq** is configured, prompts add semantic scoring on top of that baseline; results are merged in **`aiMatchingService.js`**.
5. The UI shows ranked jobs/candidates with match metadata.
6. On **Apply**, **Firestore** records the application so employers see updates.

---

## scripts

| Script            | Purpose                                      |
|-------------------|----------------------------------------------|
| `npm run dev`     | Skill extractor (Python) **and** Vite together (see `concurrently`) |
| `npm run dev:vite`| Frontend only if Python is unavailable        |
| `npm run skill-server` | Python API only (already included in `dev`)   |
| `npm run build`   | Production build                             |
| `npm run seed:companies` | Firestore dummy companies + jobs (tech + non-tech) |

**`npm run dev`** starts both the skill server and Vite. Use **`npm run dev:vite`** for frontend-only. Ensure `server/requirements.txt` is installed and `python` is on your `PATH`.
