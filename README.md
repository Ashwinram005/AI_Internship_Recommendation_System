# GetLanded AI - Internship Recommendation Engine

GetLanded is a professional hiring and candidate platform that utilizes advanced AI to match candidates with the right roles. Built with a modern technology stack, it ensures a fast, secure, and highly intelligent recruitment workflow.

## 🛠️ Technology Stack Breakdown

This application is powered by three core pillars: **React**, **Firebase**, and **Groq AI**. Here is how each technology is utilized in the recommendation engine.

---

### 1. React (Frontend & User Interface)
React (boosted by Vite for lightning-fast bundling) serves as the structural foundation of the platform.

*   **Role-Based Workflows**: React dynamically renders completely different dashboard experiences for Candidates, Employers, and Admins (`CandidateLayout`, `CompanyLayout`, `AdminLayout`) using `react-router-dom` for secure client-side navigation.
*   **State Management & Context**: We use React Context API (`AuthContext`) to securely handle the user's authentication state globally, instantly refreshing the UI without full page reloads.
*   **Glassmorphic "Luminous Ether" Design**: The UI leverages React components combined with Tailwind CSS to present a high-end, smooth aesthetic using backdrop blurs and fluid gradients.
*   **Interactive Data Views**: Complex candidate lists and job postings are rendered dynamically through modular components (`JobsList.jsx`, `JobMatcher.jsx`), allowing real-time sorting and AI metadata overlays.
*   **Document Parsing on the Client**: React handles the heavy lifting of extracting text from uploaded PDFs and DOCX files (`pdfjs-dist` & `mammoth`) entirely within the browser before sending it to the AI for evaluation.

---

### 2. Firebase (Backend as a Service)
Firebase provides the critical infrastructure for secure access and real-time database management without the need for a custom Node.js server.

*   **Firebase Authentication**: 
    *   Manages user identities using Email/Password and Google OAuth.
    *   Handles secure credential tokenization to ensure private data remains protected.
*   **Cloud Firestore (NoSQL Database)**:
    *   Acts as the central nervous system of the platform, storing highly relational document collections: `users`, `companies`, `jobs`, `resumes`, and `applications`.
    *   **Real-time Queries**: React continuously listens to Firestore snapshots to automatically update Employer dashboards the instant a new candidate applies to a job.
    *   **Security Rules**: Firestore enforces strict read/write policies, ensuring that candidates can only see their own applications, while employers maintain exclusive access to the candidates applying for their specific postings.
*   **Firebase Storage**:
    *   Securely hosts the actual physical resume files (PDF, DOCX) uploaded by the candidates, providing authorized URL links for recruiters to view them.

---

### 3. Groq AI (The Recommendation Engine)
Groq provides ultra-fast LLM (Large Language Model) inference using the `llama-3.3-70b-versatile` model. It serves as the brain behind the "AI Matcher" and the applicant evaluation layers.

*   **Deep Semantic Analysis**: Instead of just running basic keyword searches, Groq reads the extracted context of the candidate's resume and evaluates it against the deep requirements of a job posting.
*   **Structured JSON Output**: The engine leverages Groq's ability to output deterministic JSON objects. Every matched candidate receives a highly structured evaluation containing:
    *   **`matchScore`**: A precise mathematical 0-100 score indicating overall suitability.
    *   **`confidence`**: The AI's certainty metric.
    *   **`matchedSkills`**: Specific concepts found in both the resume and the job posting.
    *   **`missingRequirements`**: Critical skills or concepts missing from the candidate's profile.
*   **Batch Processing Validation**: During the "AI Matcher" phase (in `aiMatchingService.js`), a candidate's resume is sent to Groq alongside an array of multiple active job postings. Groq evaluates them all within the same context window, returning a ranked ordering of the absolute best fits, simulating an expert recruiter screening thousands of variables instantly.
*   **Hybrid Recommendation Architecture**: To prevent AI hallucination or API blocking, Groq is paired with a **Local NER System** (`localNerService.js`). The local engine extracts technical nouns using `compromise.js`, establishing a mathematical baseline match score. Groq then overlays semantic nuance and contextual understanding on top of this baseline.

---

## 🚀 How They Work Together (The Flow)

1.  A **Candidate** uploads a PDF resume (handled by **React**).
2.  **React** uploads the file to **Firebase Storage** and saves the metadata to **Firestore**.
3.  The Candidate navigates to the *AI Matcher* tab.
4.  **React** queries **Firestore** to pull all active Job Postings from various Employers.
5.  The raw text of the Candidate's uploaded resume + the details of all active Jobs are packaged and sent to the **Groq AI** API.
6.  **Groq** instantly analyzes the relationships, extracts missing skills, and returns an array of ranked `matchScores`.
7.  **React** receives Groq's JSON data, maps it over the active jobs, and renders the tailored recommendations in a glassmorphic UI. 
8.  When the Candidate clicks *Apply*, **Firebase** registers the transaction, updating the Employer's dashboard in real-time.
