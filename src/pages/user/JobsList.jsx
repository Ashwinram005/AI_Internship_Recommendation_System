import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  Filter,
  Grid2x2,
  Layers3,
  MapPin,
  Search,
  Sparkles,
  Trophy,
  WalletCards,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getApplicationsByUser } from "../../services/applicationService";
import { getVisiblePostingsForCandidates } from "../../services/postingService";
import { getResumesByUser } from "../../services/resumeService";
import {
  getGeminiKeyAvailable,
  rankJobsForResume,
} from "../../services/aiMatchingService";

export default function JobsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("match");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [jobScoresById, setJobScoresById] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [resumeUsedName, setResumeUsedName] = useState("");
  const [aiNotice, setAiNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [postings, applications] = await Promise.all([
          getVisiblePostingsForCandidates(),
          user?.uid ? getApplicationsByUser(user.uid) : Promise.resolve([]),
        ]);

        setJobs(postings);
        setAppliedJobIds(
          new Set(
            applications
              .filter((app) => app.status !== "withdrawn")
              .map((app) => app.jobId),
          ),
        );

        if (!user?.uid) {
          setAiNotice("");
          setJobScoresById({});
          return;
        }

        const resumes = await getResumesByUser(user.uid);
        if (!resumes.length) {
          setAiNotice(
            "Upload a resume to unlock AI job matching and missing skill insights.",
          );
          setJobScoresById({});
          return;
        }

        const selectedResume = [...resumes].sort(
          (a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0),
        )[0];
        setResumeUsedName(
          selectedResume.fileName || selectedResume.name || "Resume",
        );

        setAiLoading(true);
        const ranking = await rankJobsForResume({
          resume: selectedResume,
          jobs: postings,
        });

        const mapped = ranking.reduce((acc, item) => {
          acc[item.jobId] = item;
          return acc;
        }, {});

        setJobScoresById(mapped);
        if (!getGeminiKeyAvailable()) {
          setAiNotice(
            "Gemini API key missing. Showing fallback keyword-based ranking.",
          );
        } else {
          setAiNotice("");
        }
      } catch (err) {
        console.error("Failed to load jobs:", err);
        setError("Failed to load jobs. Please refresh.");
      } finally {
        setAiLoading(false);
      }
    };

    load();
  }, [user?.uid]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter, sortBy, jobs.length]);

  const normalizeType = (typeValue) =>
    (typeValue || "job").toLowerCase() === "internship" ? "internship" : "job";

  const getPostedTime = (item) => item?.createdAt?.seconds || 0;

  const getMatchScore = (jobId) => jobScoresById[jobId]?.score || 0;

  const getSearchHaystack = (job) =>
    `${job.title || ""} ${job.company || ""} ${job.skills || ""} ${job.description || ""}`.toLowerCase();

  const filtered = jobs
    .filter(
      (j) =>
        (typeFilter === "all" || normalizeType(j.type) === typeFilter) &&
        (statusFilter === "all" || j.status === statusFilter) &&
        getSearchHaystack(j).includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "latest") return getPostedTime(b) - getPostedTime(a);
      if (sortBy === "deadline") {
        return (
          new Date(a.deadline || "2100-01-01") -
          new Date(b.deadline || "2100-01-01")
        );
      }
      return getMatchScore(b.id) - getMatchScore(a.id);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    (currentPage - 1) * pageSize + pageSize,
  );

  const totalJobs = jobs.filter(
    (item) => normalizeType(item.type) === "job",
  ).length;
  const totalInternships = jobs.filter(
    (item) => normalizeType(item.type) === "internship",
  ).length;
  const totalActive = jobs.filter((item) => item.status === "active").length;

  const formatDeadline = (deadline) => {
    if (!deadline) return "Not specified";
    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) return "Not specified";
    return parsed.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <section className="glass-card p-6 md:p-7 bg-gradient-to-r from-[#f6fbfb] via-white to-[#fff9f3]">
        <div className="flex flex-col xl:flex-row gap-6 xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500 font-semibold">
              Opportunity Marketplace
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">
              Browse Roles
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">
              Explore production-ready listings across multiple companies with
              structured filtering, ranking, and match insights.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Total Listings
              </p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {jobs.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Jobs
              </p>
              <p className="text-xl font-bold text-[#0b525b] mt-1">
                {totalJobs}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Internships
              </p>
              <p className="text-xl font-bold text-[#c06b1a] mt-1">
                {totalInternships}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Open
              </p>
              <p className="text-xl font-bold text-emerald-700 mt-1">
                {totalActive}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card p-4 md:p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-3 min-w-[300px] flex-1">
            <div className="pl-2 text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search by role, company, skills, or requirement"
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 font-semibold inline-flex items-center gap-2">
            <Filter size={14} /> {filtered.length} result
            {filtered.length === 1 ? "" : "s"}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 inline-flex items-center gap-2 text-xs text-slate-600">
            <Compass size={14} />
            Page {currentPage} / {totalPages}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">
              Type
            </p>
            <div className="flex flex-wrap gap-2">
              {["all", "job", "internship"].map((value) => (
                <button
                  key={value}
                  onClick={() => setTypeFilter(value)}
                  className={`px-3 py-1.5 rounded-md text-xs border ${
                    typeFilter === value
                      ? "bg-[#0b525b] border-[#0b525b] text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {value === "all"
                    ? "All"
                    : value === "job"
                      ? "Jobs"
                      : "Internships"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {["all", "active", "disabled"].map((value) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1.5 rounded-md text-xs border ${
                    statusFilter === value
                      ? "bg-[#c06b1a] border-[#c06b1a] text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {value === "all"
                    ? "All"
                    : value === "active"
                      ? "Open"
                      : "Closed"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">
              Sort
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              <option value="match">Best Match</option>
              <option value="latest">Latest Posted</option>
              <option value="deadline">Nearest Deadline</option>
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {(aiLoading || aiNotice || resumeUsedName) && (
        <div className="glass-card p-4 space-y-1 bg-gradient-to-r from-white via-[#f4fbfb] to-[#fff9f2]">
          <p className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
            <Trophy size={15} className="text-[#0b525b]" />
            AI Job Matching
          </p>
          {resumeUsedName && (
            <p className="text-xs text-slate-500">
              Ranking using resume: {resumeUsedName}
            </p>
          )}
          {aiLoading ? (
            <p className="text-xs text-[#0b525b]">
              Analyzing resume against job descriptions...
            </p>
          ) : null}
          {aiNotice ? (
            <p className="text-xs text-amber-700">{aiNotice}</p>
          ) : null}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Search size={24} />
          </div>
          <p className="text-sm text-slate-500">
            No matching opportunities found.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginated.map((job) => (
              <div
                key={job.id}
                className="glass-card p-5 hover:border-slate-300 transition-all cursor-pointer"
                onClick={() => navigate(`/user/jobs/${job.id}`)}
              >
                {(() => {
                  const aiScore = jobScoresById[job.id];
                  return (
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#0b525b] to-[#167a86] text-white rounded-xl flex items-center justify-center">
                        <WalletCards size={20} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-slate-900 line-clamp-1">
                              {job.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                <Building2 size={14} />
                                {job.company || "Unknown Company"}
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                <MapPin size={14} />
                                Remote
                              </div>
                              <span className="text-xs uppercase tracking-wide text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {normalizeType(job.type)}
                              </span>
                            </div>
                          </div>
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {aiScore ? (
                              <span className="saas-badge badge-info">
                                {aiScore.score}% match
                              </span>
                            ) : null}
                            <span
                              className={`saas-badge ${job.status === "active" ? "badge-success" : "badge-warning"}`}
                            >
                              {job.status === "active"
                                ? "Accepting applications"
                                : "Not receiving applications"}
                            </span>
                            {appliedJobIds.has(job.id) ? (
                              <span className="saas-badge badge-info">
                                Applied
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          {(job.skills || "")
                            .split(",")
                            .filter(Boolean)
                            .slice(0, 5)
                            .map((s, i) => (
                              <span
                                key={i}
                                className="text-xs text-[#0b525b] bg-[#e5f4f6] px-2.5 py-1 rounded-md flex items-center gap-1.5"
                              >
                                <Sparkles size={10} />
                                {s.trim()}
                              </span>
                            ))}
                        </div>

                        <p className="text-sm text-slate-600 mt-4 line-clamp-2 leading-relaxed">
                          {job.description || "No description provided."}
                        </p>

                        {aiScore?.missingSkills?.length ? (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-amber-800 font-semibold">
                              Missing requirements from this job description
                            </p>
                            <ol className="mt-2 space-y-1 text-xs text-amber-900 list-decimal list-inside">
                              {aiScore.missingSkills
                                .slice(0, 4)
                                .map((skill) => (
                                  <li key={`${job.id}-${skill}`}>{skill}</li>
                                ))}
                            </ol>
                          </div>
                        ) : null}

                        {aiScore?.summary ? (
                          <p className="text-xs text-slate-500 mt-2">
                            {aiScore.summary}
                          </p>
                        ) : null}

                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={12} />
                            Closing {formatDeadline(job.deadline)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/user/jobs/${job.id}`);
                            }}
                            className="text-[#0b525b] font-semibold inline-flex items-center gap-1"
                          >
                            View job
                            <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>

          <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-slate-600 inline-flex items-center gap-2">
              <Grid2x2 size={14} />
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filtered.length)} of{" "}
              {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="saas-btn saas-btn-secondary"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
              >
                <ArrowLeft size={14} /> Prev
              </button>
              <span className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white inline-flex items-center gap-1.5">
                <Layers3 size={13} /> {currentPage} / {totalPages}
              </span>
              <button
                className="saas-btn saas-btn-secondary"
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage >= totalPages}
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
