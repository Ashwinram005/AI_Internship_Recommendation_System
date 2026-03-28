import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  FileText,
  LineChart,
  Shield,
  Upload,
} from "lucide-react";
import AnalysisResult from "../components/AnalysisResult";

export default function AILanding() {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const resultRef = useRef(null);

  const simulateAnalysis = () => {
    if (!file) return;

    setAnalyzing(true);
    setResult(null);

    setTimeout(() => {
      setResult({
        score: 82,
        strengths: [
          "Clear project and impact bullets",
          "Good structure for recruiter scan",
          "Strong role-specific keyword usage",
        ],
        weaknesses: [
          "Summary section can be sharper",
          "Missing portfolio links in header",
          "Some achievements need measurable outcomes",
        ],
        suggestions: [
          "Add a 2-line summary with domain focus",
          "Attach one portfolio/repo link in contact line",
          "Quantify at least 3 bullets with metrics",
        ],
        atsScore: 77,
        skillGaps: ["System Design", "Cloud Workflows"],
      });
      setAnalyzing(false);
      setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: "smooth" }),
        120,
      );
    }, 2200);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="bg-[var(--color-surface)]/80 backdrop-blur-xl sticky top-0 z-50 shadow-[0_4px_32px_rgba(19,27,46,0.04)]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <BriefcaseBusiness size={17} />
            </div>
            <div>
              <p className="text-sm font-bold text-xl text-slate-900 tracking-tight">GetLanded</p>
              <p className="text-[11px] text-slate-500">
                Resume Intelligence Suite
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="saas-btn saas-btn-secondary">
              Sign In
            </Link>
            <Link to="/signup" className="saas-btn saas-btn-primary">
              Create Account
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 lg:px-8 py-12 lg:py-16 space-y-14">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-[var(--color-primary)] bg-[var(--color-surface)] shadow-[0_2px_12px_rgba(19,27,46,0.06)]">
              <BadgeCheck size={14} /> Trusted by Career Teams
            </span>
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tighter text-[var(--text-main)] leading-tight">
              Resume screening that feels <span className="gradient-text">operational</span>, not experimental.
            </h1>
            <p className="text-slate-600 text-base max-w-2xl">
              Upload a resume and get a structured assessment with scoring, ATS
              check, and focused improvement suggestions. Built for serious
              hiring and candidate preparation workflows.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
              <div className="glass-card p-4">
                <p className="text-2xl font-extrabold text-slate-900">50K+</p>
                <p className="text-xs text-slate-500 mt-1">Resumes assessed</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-2xl font-extrabold text-slate-900">77%</p>
                <p className="text-xs text-slate-500 mt-1">
                  Avg ATS readiness uplift
                </p>
              </div>
              <div className="glass-card p-4">
                <p className="text-2xl font-extrabold text-slate-900">2 min</p>
                <p className="text-xs text-slate-500 mt-1">
                  Typical review cycle
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 glass-card p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Start Resume Review
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Upload one file in PDF or DOCX format.
              </p>
            </div>

            <button
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-2xl bg-[var(--color-surface-alt)] p-8 text-center hover:shadow-[0_4px_16px_rgba(19,27,46,0.04)] transition-all"
            >
              <div className="mx-auto w-12 h-12 rounded-xl bg-white shadow-sm text-[var(--text-main)] flex items-center justify-center">
                <Upload size={20} />
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-3">
                {file ? file.name : "Select Resume File"}
              </p>
              <p className="text-xs text-slate-500 mt-1">PDF or DOCX only</p>
            </button>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            <button
              onClick={simulateAnalysis}
              disabled={!file || analyzing}
              className="saas-btn saas-btn-primary w-full"
            >
              {analyzing ? "Analyzing..." : "Analyze Resume"}
              <ArrowRight size={15} />
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5">
            <LineChart size={18} className="text-slate-700" />
            <h3 className="font-bold text-slate-900 mt-3">Score Precision</h3>
            <p className="text-sm text-slate-600 mt-1">
              Clear score model across structure, relevance, and readability.
            </p>
          </div>
          <div className="glass-card p-5">
            <Shield size={18} className="text-slate-700" />
            <h3 className="font-bold text-slate-900 mt-3">ATS Coverage</h3>
            <p className="text-sm text-slate-600 mt-1">
              Helps ensure resume formatting and language pass ATS filtering.
            </p>
          </div>
          <div className="glass-card p-5">
            <FileText size={18} className="text-slate-700" />
            <h3 className="font-bold text-slate-900 mt-3">Actionable Notes</h3>
            <p className="text-sm text-slate-600 mt-1">
              Specific next-step improvements instead of generic feedback.
            </p>
          </div>
        </section>
      </main>

      {result && (
        <div ref={resultRef}>
          <AnalysisResult result={result} />
        </div>
      )}
    </div>
  );
}
