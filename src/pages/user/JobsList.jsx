import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, Calendar, MapPin, ArrowUpRight, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getApplicationsByUser } from "../../services/applicationService";
import { getVisiblePostingsForCandidates } from "../../services/postingService";

export default function JobsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
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
      } catch (err) {
        console.error("Failed to load jobs:", err);
        setError("Failed to load jobs. Please refresh.");
      }
    };

    load();
  }, [user?.uid]);

  const filtered = jobs.filter(
    (j) =>
      (typeFilter === "all" || (j.type || "job") === typeFilter) &&
      (
        (j.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (j.company || "").toLowerCase().includes(search.toLowerCase()) ||
        (j.skills || "").toLowerCase().includes(search.toLowerCase())
      ),
  );

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
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-[Poppins]">
            Browse Jobs
          </h1>
          <p className="text-slate-500 mt-1">
            Discover internships and jobs in a professional board view.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center gap-3 min-w-[300px] w-full md:w-[380px]">
          <div className="pl-2 text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search jobs..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card p-3 flex items-center gap-2 w-fit">
        <button
          onClick={() => setTypeFilter("all")}
          className={`px-3 py-1.5 rounded-md text-sm ${typeFilter === "all" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          All
        </button>
        <button
          onClick={() => setTypeFilter("job")}
          className={`px-3 py-1.5 rounded-md text-sm ${typeFilter === "job" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          Jobs
        </button>
        <button
          onClick={() => setTypeFilter("internship")}
          className={`px-3 py-1.5 rounded-md text-sm ${typeFilter === "internship" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          Internships
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((job) => (
            <div
              key={job.id}
              className="glass-card p-5 hover:border-slate-300 transition-all cursor-pointer"
              onClick={() => navigate(`/user/jobs/${job.id}`)}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg flex items-center justify-center font-semibold text-lg">
                  {(job.company || "C").charAt(0).toUpperCase()}
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
                        <span className="text-xs uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {job.type || "job"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`saas-badge ${job.status === "active" ? "badge-success" : "badge-warning"}`}
                      >
                        {job.status === "active"
                          ? "Accepting applications"
                          : "Not receiving applications"}
                      </span>
                      {appliedJobIds.has(job.id) ? (
                        <span className="saas-badge badge-info">Applied</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {(job.skills || "").split(",").filter(Boolean).map((s, i) => (
                      <span
                        key={i}
                        className="text-xs text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-md flex items-center gap-1.5"
                      >
                        <Sparkles size={10} />
                        {s.trim()}
                      </span>
                    ))}
                  </div>

                  <p className="text-sm text-slate-600 mt-4 line-clamp-2 leading-relaxed">
                    {job.description || "No description provided."}
                  </p>

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
                      className="text-indigo-600 font-medium inline-flex items-center gap-1"
                    >
                      View job
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
