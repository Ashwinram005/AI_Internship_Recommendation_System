# Career Match AI Engine: How it Works

The recommendation engine uses a hybrid approach to match resumes against job descriptions, combining state-of-the-art AI (Groq/Llama 3.3) with a robust keyword-based fallback system.

## 1. Data Extraction & Preprocessing
Before matching occurs, the system extracts text from the uploaded resume:
- **PDFs**: Extracted using OCR or direct text extraction.
- **DOC/DOCX**: Converted to HTML and then stripped of tags to get clean plain text.
- **Normalization**: All text (resume and job descriptions) is normalized to remove extra whitespace and special characters.

## 2. Core Matching Logic

The engine prioritizes high-quality AI analysis but ensures reliability through multi-tier processing.

### Tier 1: AI-Powered Matching (Groq)
If a `VITE_GROQ_API_KEY` is available, the system uses the `llama-3.3-70b-versatile` model to perform a deep semantic analysis.
- **Contextual Understanding**: The AI looks beyond simple keywords to understand the *meaning* of the experience and requirements.
- **Scoring (0-100)**: A precise score is generated based on how well the candidate's profile fits the job's core needs.
- **Skill Gap Analysis**: The AI identifies:
  - **Matched Skills**: Relevant abilities found in both the resume and the job.
  - **Missing Skills**: Critical requirements from the job description not found in the resume.
- **Reasoning**: A concise summary (under 18 words) explaining the match result.

### Tier 2: Resilience & Retries
AI calls are wrapped in a **Resilience Layer**:
- **Retry Mechanism**: If the AI service returns a `429 Rate Limit` error, the system automatically retries with **Exponential Backoff** (2s, 4s, 8s wait times).
- **Batch Processing**: Up to 20 jobs or 25 candidates can be ranked in a single AI request to optimize token usage.

### Tier 3: Local NER Engine (High-Fidelity Fallback)
If the AI service is unavailable, hitting limits, or disabled, the system uses a sophisticated **Local Named Entity Recognition (NER)** engine:
- **Client-Side NLP**: Uses the `compromise` library to perform Natural Language Processing directly in the browser.
- **Technical Dictionary**: Utilizes a specialized dictionary of 50+ technical skills and titles to identify key entities in the resume.
- **Structured Extraction**:
  - **Skills**: Extracts technical keywords with context.
  - **Experience**: Identifies years/durations of experience to weigh the match.
  - **Titles**: Matches job roles for semantic relevance.
- **Dynamic Scoring**: Calculates a weighted score based on skill overlap (70%), title relevance (20%), and content depth (10%), providing results that rival basic LLM analysis.

## 3. Candidate & Job Matching Flows

### User Side (Job Discovery)
When a user views jobs, the system:
1. Takes the user's active resume.
2. Batches the top 20 most relevant jobs.
3. Ranks them using the Hybrid Engine.
4. Returns a sorted list with match percentages and skill gaps.

### Recruiter Side (Applicant Triage)
When a recruiter views applicants for a job:
1. The system collects up to 25 candidates.
2. Ranks them in a single batch (or individually if PDF analysis is needed).
3. Provides a prioritized list to help recruiters focus on the best fits first.

---
**Note**: The engine is designed to be "Always-On." Even if AI services are down, users will always see a high-quality, NER-driven recommendation powered by the **Local Platform Mode**.
