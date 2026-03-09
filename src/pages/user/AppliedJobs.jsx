import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  canWithdrawApplicationStatus,
  getApplicationStatusLabel,
  getApplicationsByUser,
  withdrawApplication,
} from "../../services/applicationService";
import { getVisiblePostingsForCandidates } from "../../services/postingService";
import {
  FileText,
  Briefcase,
  CalendarDays,
  CircleCheck,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowUpRight,
} from "lucide-react";

export default function AppliedJobs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.uid) return;

        const [userApps, jobsSnap] = await Promise.all([
          getApplicationsByUser(user.uid),
          getVisiblePostingsForCandidates(),
        ]);

        setApplications(userApps);
        setJobs(jobsSnap);
      } catch (err) {
        console.error("Failed to load applications:", err);
        setError("Could not load applications. Please refresh.");
      }
    };

    load();
  }, [user?.uid]);

  const handleWithdraw = async (applicationId) => {
    try {
      setUpdatingId(applicationId);
      setError("");
      setSuccess("");
      await withdrawApplication(applicationId);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: "withdrawn" } : app,
        ),
      );
      setSuccess("Application withdrawn.");
    } catch (err) {
      console.error("Withdraw failed:", err);
      setError(err.message || "Could not withdraw application.");
    } finally {
      setUpdatingId("");
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === "hired") return "badge-success";
    if (status === "rejected" || status === "withdrawn") return "badge-warning";
    if (status === "interview" || status === "offered" || status === "shortlisted") {
      return "badge-info";
    }
    return "badge-info";
  };

  const visibleApplications = applications
    .filter((app) => statusFilter === "all" || app.status === statusFilter)
    .filter((app) => {
      const job = jobs.find((j) => j.id === app.jobId);
      const haystack = `${job?.title || ""} ${job?.company || ""} ${app.resumeName || ""}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    })
    .sort((a, b) => (b.dateApplied?.seconds || 0) - (a.dateApplied?.seconds || 0));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-[Poppins]">
            Applied Jobs
          </h1>
          <p className="text-slate-500 mt-1">Your application history</p>
        </div>
        <div className="saas-badge badge-info">
          {visibleApplications.length} Showing
        </div>
      </div>

      <div className="glass-card p-3 space-y-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center gap-3 min-w-[300px]">
          <div className="pl-2 text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by title, company, resume..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "submitted", "reviewing", "shortlisted", "interview", "offered", "hired", "rejected", "withdrawn"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-md text-xs ${statusFilter === status ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {status === "all" ? "All" : getApplicationStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-600 text-sm">
            {success}
          </div>
        )}

        {visibleApplications.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Briefcase size={24} />
            </div>
            <p className="text-sm text-slate-500">
              You haven't applied to any jobs yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleApplications.map((app) => {
              const job = jobs.find((j) => j.id === app.jobId);
              return (
                <div
                  key={app.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {job?.title || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {job?.company || "Unknown"}
                    </p>
                    <button
                      onClick={() =>
                        setExpandedId((prev) => (prev === app.id ? "" : app.id))
                      }
                      className="mt-2 text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
                    >
                      {expandedId === app.id ? "Hide details" : "View details"}
                      {expandedId === app.id ? (
                        <ChevronUp size={13} />
                      ) : (
                        <ChevronDown size={13} />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-4 md:gap-6 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <FileText size={14} className="text-indigo-500" />
                      <span className="truncate max-w-[170px]">
                        {app.resumeName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <CalendarDays size={14} />
                      {app.dateApplied?.seconds
                        ? new Date(app.dateApplied.seconds * 1000).toLocaleDateString()
                        : "-"}
                    </div>

                    <div className={`saas-badge ${getStatusBadgeClass(app.status)} gap-1.5`}>
                      <CircleCheck size={11} />
                      {getApplicationStatusLabel(app.status)}
                    </div>

                    <button
                      onClick={() => handleWithdraw(app.id)}
                      disabled={!canWithdrawApplicationStatus(app.status) || updatingId === app.id}
                      className="saas-btn saas-btn-secondary py-1.5 px-3 text-xs disabled:opacity-50"
                    >
                      {updatingId === app.id ? "Updating..." : "Withdraw"}
                    </button>

                    <button
                      onClick={() => job?.id && navigate(`/user/jobs/${job.id}`)}
                      className="saas-btn saas-btn-secondary py-1.5 px-3 text-xs"
                    >
                      View Job
                      <ArrowUpRight size={12} />
                    </button>
                  </div>

                  {expandedId === app.id && (
                    <div className="md:col-span-2 mt-1 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Full Description
                      </p>
                      <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                        {job?.description || "No description provided."}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        <div className="bg-white border border-slate-200 rounded px-2.5 py-1.5">
                          <span className="text-slate-400">Type</span>
                          <p className="text-slate-700 font-medium mt-0.5 uppercase">
                            {job?.type || "job"}
                          </p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded px-2.5 py-1.5">
                          <span className="text-slate-400">Skills</span>
                          <p className="text-slate-700 font-medium mt-0.5">
                            {job?.skills || "Not specified"}
                          </p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded px-2.5 py-1.5">
                          <span className="text-slate-400">Deadline</span>
                          <p className="text-slate-700 font-medium mt-0.5">
                            {job?.deadline
                              ? new Date(job.deadline).toLocaleDateString()
                              : "Not specified"}
                          </p>
                        </div>
                      </div>

                      {(app.statusReason || app.statusNote) && (
                        <div className="mt-2 bg-white border border-slate-200 rounded px-3 py-2 text-xs space-y-1">
                          {app.statusReason && (
                            <p className="text-slate-600">
                              <span className="text-slate-400">Reason:</span> {app.statusReason}
                            </p>
                          )}
                          {app.statusNote && (
                            <p className="text-slate-600">
                              <span className="text-slate-400">Note:</span> {app.statusNote}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
