import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Users,
  Sparkles,
  Trash2,
  CheckCircle2,
  Eye,
  FileText,
  Mail,
  UserRound,
  X,
  Search,
  Briefcase,
  Clock3,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  canDeleteApplicationRecordStatus,
  getApplicationsByJobIds,
  getApplicationStatusLabel,
  getNextCompanyStatuses,
  deleteApplicationRecord,
  updateApplicationStatus,
} from "../../services/applicationService";
import {
  deletePostingPermanently,
  getCompanyPostings,
  setPostingStatus,
} from "../../services/postingService";
import { getUsersByIds } from "../../services/userProfileService";
import { getResumesByIds } from "../../services/resumeService";
import {
  convertDocToHtml,
  dataUrlToBlob,
  inferResumeMimeType,
  isPdfResume,
  openResumeInNewTab,
} from "../../utils/resumePreview";
import {
  getGroqKeyAvailable,
  rankCandidatesForJob,
} from "../../services/aiMatchingService";

export default function ManageJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobSearch, setJobSearch] = useState("");
  const [applicantSearch, setApplicantSearch] = useState("");
  const [rejectDialogApp, setRejectDialogApp] = useState(null);
  const [rejectReason, setRejectReason] = useState(
    "Not a fit for role requirements",
  );
  const [rejectNote, setRejectNote] = useState("");
  const [updatingApplicationId, setUpdatingApplicationId] = useState("");
  const [candidateProfilesById, setCandidateProfilesById] = useState({});
  const [candidateResumesById, setCandidateResumesById] = useState({});
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewBlobUrl, setPreviewBlobUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [candidateScoreByApplicationId, setCandidateScoreByApplicationId] =
    useState({});
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingNotice, setRankingNotice] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCompanyData = async () => {
    if (!user?.uid) return;

    try {
      setError("");
      const companyJobs = await getCompanyPostings(user.uid);
      setJobs(companyJobs);

      const jobIds = companyJobs.map((job) => job.id);
      const companyApps = await getApplicationsByJobIds(jobIds, {
        companyId: user.uid,
      });
      setApplications(companyApps);

      const [profiles, resumes] = await Promise.all([
        getUsersByIds(companyApps.map((app) => app.userId)),
        getResumesByIds(companyApps.map((app) => app.resumeId)),
      ]);

      setCandidateProfilesById(
        profiles.reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {}),
      );

      setCandidateResumesById(
        resumes.reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {}),
      );
    } catch (err) {
      console.error("Failed to load company jobs:", err);
      setError("Could not load job management data.");
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, [user?.uid]);

  const appsFor = (id) =>
    applications
      .filter((a) => a.jobId === id)
      .sort(
        (a, b) => (b.dateApplied?.seconds || 0) - (a.dateApplied?.seconds || 0),
      );

  useEffect(() => {
    const runCandidateRanking = async () => {
      if (!selected?.id) {
        setCandidateScoreByApplicationId({});
        setRankingNotice("");
        return;
      }

      const selectedApps = applications.filter(
        (item) => item.jobId === selected.id,
      );
      if (!selectedApps.length) {
        setCandidateScoreByApplicationId({});
        return;
      }

      try {
        setRankingLoading(true);
        const candidates = selectedApps.map((app) => {
          const candidate = candidateProfilesById[app.userId] || {};
          const resumeDoc = candidateResumesById[app.resumeId] || null;
          return {
            applicationId: app.id,
            candidateName: candidate.name || "Candidate",
            resume: buildResumeView(app, resumeDoc),
          };
        });

        const ranked = await rankCandidatesForJob({
          job: selected,
          candidates,
        });

        const mapped = ranked.reduce((acc, item) => {
          acc[item.applicationId] = item;
          return acc;
        }, {});

        setCandidateScoreByApplicationId(mapped);
        setRankingNotice(
          getGroqKeyAvailable()
            ? ""
            : "Groq API key missing. Showing fallback keyword-based ranking.",
        );
      } catch (err) {
        console.error("Candidate ranking failed:", err);
        setRankingNotice("AI ranking temporarily unavailable.");
      } finally {
        setRankingLoading(false);
      }
    };

    runCandidateRanking();
  }, [selected?.id, applications, candidateProfilesById, candidateResumesById]);

  const changePostingStatus = async (id, status) => {
    try {
      setError("");
      setSuccess("");
      await setPostingStatus(id, status);
      setSuccess("Posting status updated.");
      await loadCompanyData();
    } catch (err) {
      console.error("Failed to update posting status:", err);
      setError("Could not update posting status.");
    }
  };

  const deletePosting = async (id) => {
    try {
      setError("");
      setSuccess("");
      await deletePostingPermanently(id);
      await loadCompanyData();
      setSuccess("Posting deleted.");
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error("Failed to delete posting:", err);
      setError("Could not delete posting.");
    }
  };

  const setApplicantStatus = async (applicationId, status, meta = {}) => {
    try {
      setUpdatingApplicationId(applicationId);
      setError("");
      setSuccess("");
      await updateApplicationStatus(applicationId, status, {
        changedByRole: "company",
        changedById: user?.uid || null,
        ...meta,
      });
      setSuccess("Applicant status updated.");
      await loadCompanyData();
    } catch (err) {
      console.error("Failed to update application:", err);
      setError(err.message || "Could not update applicant status.");
    } finally {
      setUpdatingApplicationId("");
    }
  };

  const openRejectDialog = (application) => {
    setRejectDialogApp(application);
    setRejectReason("Not a fit for role requirements");
    setRejectNote("");
  };

  const confirmReject = async () => {
    if (!rejectDialogApp) return;
    await setApplicantStatus(rejectDialogApp.id, "rejected", {
      reason: rejectReason,
      note: rejectNote,
    });
    setRejectDialogApp(null);
  };

  const deleteApplication = async (applicationId) => {
    const target = applications.find((app) => app.id === applicationId);
    if (!target) {
      setError("Application not found.");
      return;
    }

    if (!canDeleteApplicationRecordStatus(target.status)) {
      setError("Only final applications can be permanently deleted.");
      return;
    }

    const ok = window.confirm(
      "Delete this application record permanently? This action cannot be undone.",
    );
    if (!ok) return;

    try {
      setUpdatingApplicationId(applicationId);
      setError("");
      setSuccess("");
      await deleteApplicationRecord(applicationId, {
        actorCompanyId: user?.uid || null,
      });

      if (selectedApplication?.id === applicationId) {
        setSelectedApplication(null);
      }

      setSuccess("Application record deleted.");
      await loadCompanyData();
    } catch (err) {
      console.error("Delete application failed:", err);
      setError("Could not delete application record.");
    } finally {
      setUpdatingApplicationId("");
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === "hired") return "badge-success";
    if (status === "rejected" || status === "withdrawn") return "badge-warning";
    if (status === "offered") return "badge-info";
    if (status === "interview" || status === "shortlisted") return "badge-info";
    return "badge-info";
  };

  const jobMetrics = {
    total: jobs.length,
    active: jobs.filter((j) => j.status === "active").length,
    disabled: jobs.filter((j) => j.status === "disabled").length,
    applications: applications.length,
  };

  const openResume = async (resume) => {
    try {
      await openResumeInNewTab(resume);
    } catch (err) {
      setError(err.message || "Could not open resume in new tab.");
    }
  };

  const downloadResume = (resume) => {
    if (!resume?.base64Data) return;
    const link = document.createElement("a");
    link.href = resume.base64Data;
    link.download = resume.fileName || "resume";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const prepareResumePreview = async (resume) => {
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewHtml("");
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl("");
    }

    try {
      if (isPdfResume(resume)) {
        const blob = await dataUrlToBlob(resume.base64Data);
        const url = URL.createObjectURL(blob);
        setPreviewBlobUrl(url);
      } else {
        const html = await convertDocToHtml(resume);
        setPreviewHtml(html || "<p>No readable content found.</p>");
      }
    } catch (err) {
      console.error("Resume preview preparation failed:", err);
      setPreviewError("Could not render resume preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const buildResumeView = (application, resumeDoc) => {
    const fallback = {
      fileName: application.resumeName || "Resume",
      base64Data: application.resumeSnapshotBase64 || null,
      mimeType: application.resumeMimeType || null,
      sizeBytes: application.resumeSizeBytes || null,
    };

    if (resumeDoc?.base64Data) {
      return {
        fileName: resumeDoc.fileName || fallback.fileName,
        base64Data: resumeDoc.base64Data,
        mimeType: resumeDoc.mimeType || fallback.mimeType,
        sizeBytes: resumeDoc.sizeBytes ?? fallback.sizeBytes,
      };
    }

    return fallback;
  };

  if (selected) {
    const apps = appsFor(selected.id)
      .filter((app) => statusFilter === "all" || app.status === statusFilter)
      .filter((app) => {
        const candidate = candidateProfilesById[app.userId] || {};
        const haystack =
          `${candidate.name || ""} ${candidate.email || ""} ${app.resumeName || ""}`.toLowerCase();
        return haystack.includes(applicantSearch.toLowerCase());
      })
      .sort(
        (a, b) =>
          (candidateScoreByApplicationId[b.id]?.score || 0) -
          (candidateScoreByApplicationId[a.id]?.score || 0),
      );
    return (
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelected(null)}
            className="saas-btn saas-btn-secondary p-2 rounded-lg"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 font-[Poppins]">
              {selected.title}
            </h1>
            <p className="text-slate-500 mt-0.5">
              Evaluation Pool · {apps.length} applicants
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm">
            {success}
          </div>
        )}

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              AI Ranking Activated
            </p>
            {rankingLoading ? (
              <p className="text-xs text-indigo-600">
                Scoring candidates against job description and resumes...
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Candidate prioritization shown with workflow status controls.
              </p>
            )}
            {rankingNotice ? (
              <p className="text-xs text-amber-700 mt-1">{rankingNotice}</p>
            ) : null}
          </div>
        </div>

        <div className="glass-card p-3 flex flex-wrap gap-2">
          {[
            "all",
            "submitted",
            "reviewing",
            "shortlisted",
            "interview",
            "offered",
            "hired",
            "rejected",
            "withdrawn",
          ].map((key) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs ${statusFilter === key ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {key === "all" ? "All" : getApplicationStatusLabel(key)}
            </button>
          ))}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center gap-3 min-w-[300px]">
          <div className="pl-2 text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search candidates by name, email, resume..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-300"
            value={applicantSearch}
            onChange={(e) => setApplicantSearch(e.target.value)}
          />
        </div>

        <div className="saas-table-container">
          {apps.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <Users size={24} />
              </div>
              <p className="text-sm text-slate-500">No applicants yet.</p>
            </div>
          ) : (
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Candidate</th>
                  <th>Application Date</th>
                  <th>Current Stage</th>
                  <th>Move To</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app, idx) => {
                  const candidate = candidateProfilesById[app.userId] || null;
                  const resume = candidateResumesById[app.resumeId] || null;
                  const aiScore = candidateScoreByApplicationId[app.id];
                  const score = aiScore?.score ?? Math.max(50, 95 - idx * 5);
                  const scoreType =
                    score >= 80 ? "high" : score >= 65 ? "mid" : "low";
                  const canDelete = canDeleteApplicationRecordStatus(
                    app.status,
                  );
                  return (
                    <tr key={app.id}>
                      <td>
                        <span className="saas-badge badge-info">
                          #{idx + 1}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-medium text-slate-500 text-sm">
                            {(candidate?.name || app.resumeName || "C")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-slate-900 block">
                              {candidate?.name || "Candidate"}
                            </span>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              {candidate?.email || "Email unavailable"}
                            </span>
                            <span className="text-xs text-slate-400 block mt-0.5">
                              Resume:{" "}
                              {app.resumeName ||
                                resume?.fileName ||
                                "Not attached"}
                            </span>
                            <span className={`score-badge score-${scoreType}`}>
                              {score}% fit
                            </span>
                            {aiScore?.summary ? (
                              <span className="text-xs text-slate-500 block mt-0.5">
                                {aiScore.summary}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-500">
                        {app.dateApplied?.seconds
                          ? new Date(
                            app.dateApplied.seconds * 1000,
                          ).toLocaleString()
                          : "-"}
                      </td>
                      <td>
                        <span
                          className={`saas-badge ${getStatusBadgeClass(app.status)}`}
                        >
                          {getApplicationStatusLabel(app.status)}
                        </span>
                      </td>
                      <td>
                        <select
                          defaultValue=""
                          disabled={
                            getNextCompanyStatuses(app.status).length === 0
                          }
                          onChange={(e) => {
                            if (!e.target.value) return;
                            setApplicantStatus(app.id, e.target.value);
                            e.target.value = "";
                          }}
                          className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-700 disabled:bg-slate-100"
                        >
                          <option value="">Select next stage...</option>
                          {getNextCompanyStatuses(app.status).map(
                            (nextStatus) => (
                              <option key={nextStatus} value={nextStatus}>
                                {getApplicationStatusLabel(nextStatus)}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openRejectDialog(app)}
                            disabled={
                              !getNextCompanyStatuses(app.status).includes(
                                "rejected",
                              ) || updatingApplicationId === app.id
                            }
                            className="saas-btn saas-btn-secondary py-1.5 px-3 text-xs disabled:opacity-50"
                          >
                            Reject
                          </button>
                          {app.status === "rejected" && (
                            <button
                              onClick={() =>
                                setApplicantStatus(app.id, "reviewing", {
                                  reason: "Reconsidered by hiring team",
                                  note: "Moved back to review stage.",
                                })
                              }
                              disabled={updatingApplicationId === app.id}
                              className="saas-btn saas-btn-secondary py-1.5 px-3 text-xs disabled:opacity-50"
                            >
                              Reconsider
                            </button>
                          )}
                          <button
                            onClick={() => setApplicantStatus(app.id, "hired")}
                            disabled={
                              !getNextCompanyStatuses(app.status).includes(
                                "hired",
                              ) || updatingApplicationId === app.id
                            }
                            className="saas-btn saas-btn-secondary py-1.5 px-3 text-xs disabled:opacity-50"
                          >
                            <CheckCircle2 size={12} /> Hire
                          </button>
                          <button
                            onClick={() => setSelectedApplication(app)}
                            className="saas-btn saas-btn-secondary py-1.5 px-3 text-xs"
                          >
                            <Eye size={12} /> Review
                          </button>
                          <button
                            onClick={() => deleteApplication(app.id)}
                            disabled={
                              updatingApplicationId === app.id || !canDelete
                            }
                            className="saas-btn saas-btn-secondary py-1.5 px-3 text-xs text-red-500 disabled:opacity-50"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {selectedApplication && (
          <div className="fixed inset-0 z-40 bg-slate-900/50 p-4 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Applicant Profile
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Review candidate details and the attached resume.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Close applicant panel"
                >
                  <X size={18} />
                </button>
              </div>

              {(() => {
                const candidate =
                  candidateProfilesById[selectedApplication.userId] || {};
                const resumeDoc =
                  candidateResumesById[selectedApplication.resumeId] || null;
                const resume = buildResumeView(selectedApplication, resumeDoc);
                const candidateName = candidate.name || "Candidate";
                const candidateInitial = candidateName.charAt(0).toUpperCase();
                const isPdf = isPdfResume(resume);

                return (
                  <>
                    <div className="glass-card p-4 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 font-semibold flex items-center justify-center">
                        {candidateInitial || <UserRound size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-900">
                          {candidateName}
                        </p>
                        <div className="mt-1 space-y-1 text-sm text-slate-600">
                          <p className="inline-flex items-center gap-1.5">
                            <Mail size={13} />{" "}
                            {candidate.email || "Email unavailable"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Application Decision Data
                      </h4>
                      <p className="text-sm text-slate-600">
                        Current status:{" "}
                        {getApplicationStatusLabel(selectedApplication.status)}
                      </p>
                      {selectedApplication.statusReason && (
                        <p className="text-sm text-slate-600">
                          <span className="text-slate-400">Reason:</span>{" "}
                          {selectedApplication.statusReason}
                        </p>
                      )}
                      {selectedApplication.statusNote && (
                        <p className="text-sm text-slate-600">
                          <span className="text-slate-400">Note:</span>{" "}
                          {selectedApplication.statusNote}
                        </p>
                      )}
                      <div className="pt-1">
                        <button
                          onClick={() =>
                            deleteApplication(selectedApplication.id)
                          }
                          disabled={
                            updatingApplicationId === selectedApplication.id ||
                            !canDeleteApplicationRecordStatus(
                              selectedApplication.status,
                            )
                          }
                          className="saas-btn saas-btn-secondary text-red-500 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          {updatingApplicationId === selectedApplication.id
                            ? "Deleting..."
                            : "Delete This Application"}
                        </button>
                        {!canDeleteApplicationRecordStatus(
                          selectedApplication.status,
                        ) && (
                            <p className="text-xs text-slate-500 mt-2">
                              Permanent delete is available only for final
                              applications.
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="glass-card p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Attached Resume
                      </h4>
                      <p className="text-sm text-slate-600">
                        {resume.fileName || "Resume"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Source:{" "}
                        {resumeDoc?.base64Data
                          ? "Current profile resume"
                          : "Snapshot at application time"}
                        {Number.isFinite(resume.sizeBytes)
                          ? ` · ${Math.round(resume.sizeBytes / 1024)} KB`
                          : ""}
                        {` · ${inferResumeMimeType(resume)}`}
                      </p>

                      {resume.base64Data ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openResume(resume)}
                              className="saas-btn saas-btn-primary"
                            >
                              <FileText size={14} /> View Resume
                            </button>
                            <button
                              onClick={() => downloadResume(resume)}
                              className="saas-btn saas-btn-secondary"
                            >
                              Download Resume
                            </button>
                          </div>

                          {previewLoading && (
                            <div className="glass-card p-4 text-sm text-slate-500">
                              Preparing preview...
                            </div>
                          )}

                          {!previewLoading && (
                            <button
                              onClick={() => prepareResumePreview(resume)}
                              className="saas-btn saas-btn-secondary"
                            >
                              Preview In Website
                            </button>
                          )}

                          {!previewLoading && previewError && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                              {previewError}
                            </div>
                          )}

                          {!previewLoading && previewBlobUrl && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 h-[420px]">
                              <iframe
                                title="Applicant Resume Preview"
                                src={previewBlobUrl}
                                className="w-full h-full"
                              />
                            </div>
                          )}

                          {!previewLoading && previewHtml && (
                            <div
                              className="border border-slate-200 rounded-xl p-5 prose prose-slate max-w-none"
                              // Controlled conversion from mammoth HTML output.
                              dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                          )}

                          {!previewLoading &&
                            !previewBlobUrl &&
                            !previewHtml &&
                            isPdf && (
                              <div className="text-xs text-slate-500">
                                Click "Preview In Website" to load PDF.
                              </div>
                            )}
                        </div>
                      ) : (
                        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          Resume file is unavailable for this application.
                        </p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {rejectDialogApp && (
          <div className="fixed inset-0 z-40 bg-slate-900/50 p-4 flex items-center justify-center">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Reject Application
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Add a reason so rejected data stays useful and auditable.
                  </p>
                </div>
                <button
                  onClick={() => setRejectDialogApp(null)}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Close reject dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">
                  Rejection Reason
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900"
                >
                  <option>Not a fit for role requirements</option>
                  <option>Insufficient relevant experience</option>
                  <option>Skills mismatch</option>
                  <option>Assessment performance not sufficient</option>
                  <option>Position closed</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">
                  Internal Note (optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 resize-none"
                  placeholder="Context for future reconsideration..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setRejectDialogApp(null)}
                  className="saas-btn saas-btn-secondary"
                  disabled={updatingApplicationId === rejectDialogApp.id}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  className="saas-btn saas-btn-primary"
                  disabled={
                    !rejectReason.trim() ||
                    updatingApplicationId === rejectDialogApp.id
                  }
                >
                  {updatingApplicationId === rejectDialogApp.id
                    ? "Saving..."
                    : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-[Poppins]">
            Manage Jobs
          </h1>
          <p className="text-slate-500 mt-1">
            Control and monitor your published listings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">
            Total Postings
          </p>
          <p className="text-xl font-semibold text-slate-900 mt-1 inline-flex items-center gap-2">
            <Briefcase size={16} className="text-indigo-500" />
            {jobMetrics.total}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">
            Active
          </p>
          <p className="text-xl font-semibold text-emerald-600 mt-1">
            {jobMetrics.active}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">
            Paused
          </p>
          <p className="text-xl font-semibold text-amber-600 mt-1">
            {jobMetrics.disabled}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">
            Applications
          </p>
          <p className="text-xl font-semibold text-slate-900 mt-1 inline-flex items-center gap-2">
            <Clock3 size={16} className="text-indigo-500" />
            {jobMetrics.applications}
          </p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center gap-3 min-w-[300px]">
        <div className="pl-2 text-slate-400">
          <Search size={16} />
        </div>
        <input
          type="text"
          placeholder="Search postings by role or company..."
          className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-300"
          value={jobSearch}
          onChange={(e) => setJobSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm">
          {success}
        </div>
      )}

      <div className="saas-table-container">
        <table className="saas-table">
          <thead>
            <tr>
              <th>Position & Location</th>
              <th>Status</th>
              <th>Candidates</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs
              .filter((job) => {
                const haystack =
                  `${job.title || ""} ${job.company || ""}`.toLowerCase();
                return haystack.includes(jobSearch.toLowerCase());
              })
              .map((job) => {
                const count = appsFor(job.id).length;
                const isActive = job.status === "active";
                const isDisabled = job.status === "disabled";
                return (
                  <tr key={job.id}>
                    <td>
                      <div>
                        <p className="font-medium text-slate-900">
                          {job.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {job.company} · Remote
                        </p>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`saas-badge ${isActive
                            ? "badge-success"
                            : isDisabled
                              ? "badge-warning"
                              : job.status === "hold"
                                ? "badge-info"
                                : "badge-info"
                          }`}
                      >
                        {job.status === "hold" ? "On Hold" : job.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${count > 0 ? "text-indigo-500" : "text-slate-400"}`}
                        >
                          {count}
                        </span>
                        <Users size={12} className="text-slate-400" />
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isActive && (
                          <button
                            onClick={() =>
                              changePostingStatus(job.id, "hold")
                            }
                            className="saas-btn saas-btn-secondary py-1.5 px-3 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            Hold
                          </button>
                        )}

                        {job.status === "hold" && (
                          <button
                            onClick={() =>
                              changePostingStatus(job.id, "active")
                            }
                            className="saas-btn saas-btn-secondary py-1.5 px-3 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          >
                            Resume
                          </button>
                        )}

                        {isActive ? (
                          <button
                            onClick={() =>
                              changePostingStatus(job.id, "disabled")
                            }
                            className="saas-btn saas-btn-secondary py-1.5 px-3 text-xs"
                          >
                            Disable
                          </button>
                        ) : (
                          !isActive && job.status !== "hold" && (
                            <button
                              onClick={() =>
                                changePostingStatus(job.id, "active")
                              }
                              className="saas-btn saas-btn-secondary py-1.5 px-3 text-xs"
                            >
                              Enable
                            </button>
                          )
                        )}

                        <button
                          onClick={() => deletePosting(job.id)}
                          className="saas-btn saas-btn-secondary py-1.5 px-3 text-xs"
                        >
                          <Trash2 size={12} /> Delete
                        </button>

                        <button
                          onClick={() => setSelected(job)}
                          className="saas-btn saas-btn-secondary py-1.5 px-3 text-sm"
                        >
                          Candidates
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
