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
  ArrowUpRight,
  Briefcase,
  Clock3,
  Filter,
  Layers3,
  ChevronDown,
  ChevronUp,
  Search,
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

  const STATUS_FLOW = [
    "submitted",
    "reviewing",
    "shortlisted",
    "interview",
    "offered",
    "hired",
    "rejected",
    "withdrawn",
  ];

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
    if (
      status === "interview" ||
      status === "offered" ||
      status === "shortlisted"
    ) {
      return "badge-info";
    }
    return "badge-info";
  };



  const formatAppliedDate = (seconds) => {
    if (!seconds) return "-";
    return new Date(seconds * 1000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const statusCounts = applications.reduce(
    (acc, app) => {
      const key = app.status || "submitted";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {
      all: applications.length,
      submitted: 0,
      reviewing: 0,
      shortlisted: 0,
      interview: 0,
      offered: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0,
    },
  );

  const visibleApplications = applications
    .filter((app) => statusFilter === "all" || app.status === statusFilter)
    .filter((app) => {
      const job = jobs.find((j) => j.id === app.jobId);
      const haystack =
        `${job?.title || ""} ${job?.company || ""} ${app.resumeName || ""}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    })
    .sort(
      (a, b) => (b.dateApplied?.seconds || 0) - (a.dateApplied?.seconds || 0),
    );

  const activePipelineCount =
    applications.length - (statusCounts.withdrawn + statusCounts.rejected);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <section className="glass-card p-6 md:p-7 bg-gradient-to-r from-white via-white to-[#f1f8f8]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500 font-semibold">
              Candidate Pipeline
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">
              Application Command Center
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">
              Track every submission from initial review to final outcome with a
              cleaner, structured workflow view.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Total
              </p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {applications.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Active
              </p>
              <p className="text-xl font-bold text-[#0b525b] mt-1">
                {activePipelineCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Offers/Hired
              </p>
              <p className="text-xl font-bold text-emerald-700 mt-1">
                {statusCounts.offered + statusCounts.hired}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Filtered
              </p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {visibleApplications.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
          {[
            "submitted",
            "reviewing",
            "shortlisted",
            "interview",
            "offered",
            "hired",
            "rejected",
            "withdrawn",
          ].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg border px-3 py-2 text-left transition ${statusFilter === status
                  ? "border-[#0b525b] bg-[#e5f4f6]"
                  : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
            >
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                {getApplicationStatusLabel(status)}
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {statusCounts[status] || 0}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card p-4 md:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-3 min-w-[300px] flex-1">
            <div className="pl-2 text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search by role, company, or resume"
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center gap-2 text-xs text-slate-600 font-semibold">
            <Filter size={14} />
            Status:{" "}
            {statusFilter === "all"
              ? "All"
              : getApplicationStatusLabel(statusFilter)}
          </div>
          <button
            onClick={() => setStatusFilter("all")}
            className="saas-btn saas-btn-secondary"
          >
            <Layers3 size={14} /> Show All
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", ...STATUS_FLOW].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-md text-xs border transition ${statusFilter === status
                  ? "bg-[#0b525b] text-white border-[#0b525b]"
                  : "text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
            >
              {status === "all" ? "All" : getApplicationStatusLabel(status)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {error && (
          <div className="glass-card p-3 bg-red-50 border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="glass-card p-3 bg-emerald-50 border-emerald-200 text-emerald-700 text-sm">
            {success}
          </div>
        )}

        {visibleApplications.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Briefcase size={24} />
            </div>
            <p className="text-sm text-slate-600 font-medium">
              No applications found for current filters.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Adjust status filters or explore more jobs to expand your
              pipeline.
            </p>
          </div>
        ) : (
          visibleApplications.map((app) => {
            const job = jobs.find((j) => j.id === app.jobId);
            const isExpanded = expandedId === app.id;

            return (
              <article
                key={app.id}
                className="glass-card p-5 md:p-6 border-l-4"
                style={{
                  borderLeftColor:
                    app.status === "hired"
                      ? "#136a43"
                      : app.status === "rejected" || app.status === "withdrawn"
                        ? "#b42318"
                        : "#0b525b",
                }}
              >
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`saas-badge ${getStatusBadgeClass(app.status)}`}
                      >
                        {getApplicationStatusLabel(app.status)}
                      </span>
                      <span className="text-[11px] text-slate-500 border border-slate-200 rounded-full px-2 py-0.5 bg-white">
                        Applied {formatAppliedDate(app.dateApplied?.seconds)}
                      </span>
                    </div>

                    <h2 className="text-lg md:text-xl font-semibold text-slate-900 line-clamp-2">
                      {job?.title || "Unknown role"}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {job?.company || "Unknown company"}
                    </p>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-sm">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Resume Used
                        </p>
                        <p className="text-slate-700 font-medium mt-0.5 line-clamp-1">
                          {app.resumeName || "Not available"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Role Type
                        </p>
                        <p className="text-slate-700 font-medium mt-0.5 uppercase">
                          {job?.type || "job"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Deadline
                        </p>
                        <p className="text-slate-700 font-medium mt-0.5">
                          {job?.deadline
                            ? new Date(job.deadline).toLocaleDateString()
                            : "Not specified"}
                        </p>
                      </div>
                    </div>


                  </div>

                  <div className="w-full xl:w-auto xl:min-w-[220px] flex xl:flex-col gap-2">
                    <button
                      onClick={() =>
                        job?.id && navigate(`/user/jobs/${job.id}`)
                      }
                      className="saas-btn saas-btn-secondary w-full justify-center"
                    >
                      View Job <ArrowUpRight size={14} />
                    </button>
                    <button
                      onClick={() => handleWithdraw(app.id)}
                      disabled={
                        !canWithdrawApplicationStatus(app.status) ||
                        updatingId === app.id
                      }
                      className="saas-btn saas-btn-secondary w-full justify-center disabled:opacity-50"
                    >
                      {updatingId === app.id ? "Updating..." : "Withdraw"}
                    </button>
                    <button
                      onClick={() =>
                        setExpandedId((prev) => (prev === app.id ? "" : app.id))
                      }
                      className="saas-btn saas-btn-primary w-full justify-center"
                    >
                      {isExpanded ? "Hide Details" : "Open Details"}
                      {isExpanded ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="xl:col-span-2 space-y-2">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Role Description
                      </p>
                      <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                        {job?.description || "No description provided."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">
                          Skills
                        </p>
                        <p className="text-sm text-slate-700 mt-1">
                          {job?.skills || "Not specified"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">
                          Decision Notes
                        </p>
                        {app.statusReason || app.statusNote ? (
                          <div className="space-y-1 mt-1 text-sm text-slate-700">
                            {app.statusReason ? (
                              <p>
                                <span className="text-slate-500">Reason:</span>{" "}
                                {app.statusReason}
                              </p>
                            ) : null}
                            {app.statusNote ? (
                              <p>
                                <span className="text-slate-500">Note:</span>{" "}
                                {app.statusNote}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 mt-1">
                            No additional notes yet.
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-2 text-sm text-slate-600">
                        <Clock3 size={14} className="text-slate-400" />
                        Last update follows status transition history.
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
