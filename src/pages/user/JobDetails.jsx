import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
   ArrowLeft,
   ArrowUpRight,
   Building2,
   CalendarDays,
   FileText,
   Globe,
   Loader2,
   MapPin,
   Sparkles,
   WalletCards,
   X,
} from "lucide-react";
import PageLoader from "../../components/ui/PageLoader";
import { useAuth } from "../../context/AuthContext";
import {
   createApplication,
   getApplicationsByUser,
} from "../../services/applicationService";
import { getPostingById, getVisiblePostingsForCandidates } from "../../services/postingService";
import { getResumesByUser } from "../../services/resumeService";
import { rankJobsForResume } from "../../services/aiMatchingService";

export default function JobDetails() {
   const navigate = useNavigate();
   const { jobId } = useParams();
   const { user } = useAuth();

   const [job, setJob] = useState(null);
   const [resumes, setResumes] = useState([]);
   const [appliedJobIds, setAppliedJobIds] = useState(new Set());
   const [selectedResumeId, setSelectedResumeId] = useState("");
   const [showApplyModal, setShowApplyModal] = useState(false);
   const [confirmReady, setConfirmReady] = useState(false);
   const [loading, setLoading] = useState(true);
   const [submitting, setSubmitting] = useState(false);
   const [error, setError] = useState("");
   const [success, setSuccess] = useState("");

   // Compare with Resume state
   const [showComparePanel, setShowComparePanel] = useState(false);
   const [compareResumeId, setCompareResumeId] = useState("");
   const [compareResult, setCompareResult] = useState(null);
   const [comparing, setComparing] = useState(false);
   const [compareError, setCompareError] = useState("");

   useEffect(() => {
      const load = async () => {
         try {
            setLoading(true);
            setError("");
            setSuccess("");

            const [posting, applications, userResumes] = await Promise.all([
               getPostingById(jobId),
               user?.uid ? getApplicationsByUser(user.uid) : Promise.resolve([]),
               user?.uid ? getResumesByUser(user.uid) : Promise.resolve([]),
            ]);

            setJob(posting);
            setAppliedJobIds(
               new Set(
                  applications
                     .filter((app) => app.status !== "withdrawn")
                     .map((app) => app.jobId),
               ),
            );
            setResumes(userResumes || []);
            if (userResumes?.length) {
               setSelectedResumeId(userResumes[0].id);
               setCompareResumeId(userResumes[0].id);
            }
         } catch (err) {
            console.error("Failed to load job details:", err);
            setError("Could not load this job right now.");
         } finally {
            setLoading(false);
         }
      };

      load();
   }, [jobId, user?.uid]);

   const canApply = job?.status === "active" && !appliedJobIds.has(job?.id);

   const deadlineLabel = useMemo(() => {
      if (!job?.deadline) return "Not specified";
      const parsed = new Date(job.deadline);
      if (Number.isNaN(parsed.getTime())) return "Not specified";
      return parsed.toLocaleDateString(undefined, {
         month: "long",
         day: "numeric",
         year: "numeric",
      });
   }, [job?.deadline]);

   const openApplyModal = () => {
      setError("");
      setSuccess("");
      setConfirmReady(false);

      if (!resumes.length) {
         setError("Upload a resume in Profile before applying.");
         return;
      }

      if (!canApply) return;
      setShowApplyModal(true);
   };

   const handleApply = async () => {
      if (!selectedResumeId || !job || !user?.uid) {
         setError("Please choose a resume to continue.");
         return;
      }

      const selectedResume = resumes.find(
         (resume) => resume.id === selectedResumeId,
      );
      if (!selectedResume) {
         setError("Selected resume is not available. Please choose again.");
         return;
      }

      try {
         setSubmitting(true);
         setError("");
         await createApplication({
            jobId: job.id,
            userId: user.uid,
            companyId: job.companyId || null,
            resumeId: selectedResume.id,
            resumeName: selectedResume.fileName || selectedResume.name || "Resume",
            resumeSnapshotBase64: selectedResume.base64Data || null,
            resumeMimeType: selectedResume.mimeType || null,
            resumeSizeBytes: selectedResume.sizeBytes || null,
         });

         setAppliedJobIds((prev) => new Set([...prev, job.id]));
         setShowApplyModal(false);
         setSuccess("Application submitted successfully.");
      } catch (err) {
         console.error("Application failed:", err);
         setError(err.message || "Could not submit application.");
      } finally {
         setSubmitting(false);
      }
   };

   const handleCompare = async () => {
      const resume = resumes.find((r) => r.id === compareResumeId);
      if (!resume) {
         setCompareError("Please select a resume to compare.");
         return;
      }
      if (!resume.base64Data) {
         setCompareError("This resume file is missing. Please re-upload it in your Profile.");
         return;
      }
      try {
         setComparing(true);
         setCompareError("");
         setCompareResult(null);
         const allJobs = await getVisiblePostingsForCandidates();
         // Prioritize the current job by putting it at the front of the array
         const otherJobs = allJobs.filter(j => j.id !== job.id);
         const jobsToRank = [{ ...job, id: job.id }, ...otherJobs];

         const results = await rankJobsForResume({ resume, jobs: jobsToRank });
         if (!results || results.length === 0) {
            setCompareError("No comparison result returned. The resume may have no extractable text.");
            return;
         }
         const result = results.find((r) => r.jobId === job.id);
         if (!result) {
            setCompareError("Failed to calculate a score for this specific role.");
            return;
         }
         
         setCompareResult(result);
      } catch (err) {
         console.error("Compare failed:", err);
         setCompareError(`Comparison failed: ${err?.message || "Unknown error. Check console for details."}`);
      } finally {
         setComparing(false);
      }
   };

   if (loading) {
      return (
         <div className="max-w-5xl">
            <PageLoader
               variant="embedded"
               label="Loading job details"
               sublabel="Fetching the listing and your application status…"
               className="glass-card rounded-2xl min-h-[280px]"
            />
         </div>
      );
   }

   if (!job || job.status === "deleted") {
      return (
         <div className="max-w-5xl space-y-4">
            <button
               onClick={() => navigate("/user/jobs")}
               className="saas-btn saas-btn-secondary w-fit"
            >
               <ArrowLeft size={16} /> Back to Jobs
            </button>
            <div className="glass-card p-10 text-center">
               <p className="text-slate-700 font-medium">Job not found</p>
               <p className="text-sm text-slate-500 mt-1">
                  This listing may have been removed.
               </p>
            </div>
         </div>
      );
   }

   return (
      <div className="max-w-5xl space-y-6">
         <button
            onClick={() => navigate("/user/jobs")}
            className="saas-btn saas-btn-secondary w-fit"
         >
            <ArrowLeft size={16} /> Back to Jobs
         </button>

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

         {job.status === "hold" && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <X size={16} />
               </div>
               <div>
                  <p className="font-semibold">No longer accepting applications</p>
                  <p className="text-xs opacity-80">
                     The company has paused new applications for this role.
                  </p>
               </div>
            </div>
         )}

         {/* ── HERO HEADER CARD ── */}
         <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] overflow-hidden border border-slate-100">
            {/* Gradient accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

            <div className="p-6 md:p-8">
               <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  {/* Left: title + meta */}
                  <div className="min-w-0 flex-1">
                     <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                           {job.type || "Internship"}
                        </span>
                        <span className="bg-violet-50 text-violet-700 border border-violet-200 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                           {job.experienceLevel || "Junior"}
                        </span>
                        <span
                           className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              job.status === "active"
                                 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                 : "bg-amber-50 text-amber-700 border-amber-200"
                           }`}
                        >
                           {job.status === "active" ? "● Open" : "● On Hold"}
                        </span>
                     </div>

                     <h1 className="text-2xl md:text-[1.75rem] font-bold text-slate-900 tracking-tight font-[Poppins] leading-snug">
                        {job.title}
                     </h1>

                     <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                           <Building2 size={14} className="text-slate-400" />
                           <span className="font-medium text-slate-700">{job.company || "Unknown Company"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                           <MapPin size={14} className="text-slate-400" />
                           {job.location || "Global"} · {job.workSetting || "Remote"}
                        </span>
                        {job.salaryRange && (
                           <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                              <WalletCards size={14} />
                              {job.salaryRange}
                           </span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                           <CalendarDays size={14} className="text-slate-400" />
                           Closes {deadlineLabel}
                        </span>
                     </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex flex-col gap-3 min-w-[220px]">
                     <button
                        onClick={() => {
                           setShowComparePanel((v) => !v);
                           if (!showComparePanel) {
                              setCompareResult(null);
                              setCompareError("");
                           }
                        }}
                        className={`saas-btn text-sm py-2 ${showComparePanel ? "bg-slate-100 text-slate-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                     >
                        <Sparkles size={14} />
                        {showComparePanel ? "Close Compare" : "Compare Resume"}
                     </button>
                     {appliedJobIds.has(job.id) ? (
                        <span className="saas-badge badge-info justify-center py-2 text-xs">✓ Already Applied</span>
                     ) : (
                        <button
                           onClick={openApplyModal}
                           disabled={!canApply}
                           className="saas-btn saas-btn-primary disabled:opacity-50 text-sm py-2 inline-flex items-center gap-1.5 justify-center"
                        >
                           Apply Now
                           <ArrowUpRight size={14} />
                        </button>
                     )}

                     {/* Company website link */}
                     {job.companyWebsite && (
                        <a
                           href={job.companyWebsite}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="saas-btn saas-btn-secondary text-xs py-1.5 inline-flex items-center gap-1.5 justify-center"
                        >
                           <Globe size={12} /> Visit Company Site
                        </a>
                     )}
                  </div>
               </div>

               {/* Compare Panel */}
               {showComparePanel && (
                  <div className="mt-6 pt-5 border-t border-slate-100">
                     <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 transition-all animate-in fade-in slide-in-from-top-2">
                        {!compareResult && !comparing ? (
                           <div className="space-y-3">
                              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">AI Resume Compatibility</p>
                              <div className="relative">
                                 <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                 <select
                                    value={compareResumeId}
                                    onChange={(e) => { setCompareResumeId(e.target.value); setCompareResult(null); }}
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                                 >
                                    <option value="">Select Resume...</option>
                                    {resumes.map((r) => (
                                       <option key={r.id} value={r.id}>
                                          {r.fileName || r.name || "Resume"}
                                       </option>
                                    ))}
                                 </select>
                              </div>
                              <button
                                 onClick={handleCompare}
                                 disabled={comparing || !compareResumeId}
                                 className="w-full saas-btn bg-blue-600 text-white hover:bg-blue-700 text-xs py-2 disabled:opacity-50"
                              >
                                 Check Compatibility
                              </button>
                              {compareError && (
                                 <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
                                    {compareError}
                                 </p>
                              )}
                           </div>
                        ) : comparing ? (
                           <div className="flex flex-col items-center justify-center py-6 gap-3">
                              <Loader2 className="h-7 w-7 text-indigo-600 animate-spin" strokeWidth={2} aria-hidden />
                              <span className="text-xs text-slate-600 font-medium">Analyzing resume fit…</span>
                              <span className="text-[11px] text-slate-400 text-center max-w-[220px]">Matching skills and experience against this role.</span>
                           </div>
                        ) : (
                           <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                 <div
                                    className="flex flex-col items-center justify-center w-14 h-14 rounded-full border-[3px] shrink-0 bg-white shadow-sm"
                                    style={{
                                       borderColor: compareResult.score >= 80 ? "#22c55e" : compareResult.score >= 60 ? "#f59e0b" : "#ef4444",
                                    }}
                                 >
                                    <span className="text-lg font-bold text-slate-900">{compareResult.score}</span>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">% Fit</span>
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">Analysis Result</p>
                                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-3">
                                       {compareResult.summary || "Matching based on extracted skills and experience."}
                                    </p>
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                 <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5">
                                    <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1.5">✓ Matched Skills</p>
                                    <div className="flex flex-wrap gap-1">
                                       {compareResult.matchedSkills?.length > 0 ? (
                                          compareResult.matchedSkills.slice(0, 6).map((s, i) => (
                                             <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200/50 font-medium whitespace-nowrap">
                                                {s}
                                             </span>
                                          ))
                                       ) : (
                                          <span className="text-[9px] text-slate-400 italic">No direct matches.</span>
                                       )}
                                    </div>
                                 </div>
                                 <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-2.5">
                                    <p className="text-[10px] font-bold text-rose-700 uppercase mb-1.5">✗ Missing Skills</p>
                                    <div className="flex flex-wrap gap-1">
                                       {compareResult.missingSkills?.length > 0 ? (
                                          compareResult.missingSkills.slice(0, 6).map((s, i) => (
                                             <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200/50 font-medium whitespace-nowrap">
                                                {s}
                                             </span>
                                          ))
                                       ) : (
                                          <span className="text-[9px] text-slate-400 italic">No major gaps!</span>
                                       )}
                                    </div>
                                 </div>
                              </div>
                              <button
                                 onClick={() => setCompareResult(null)}
                                 className="w-full text-[10px] text-indigo-600 font-semibold hover:underline bg-indigo-50/50 py-1.5 rounded-lg"
                              >
                                 Re-run with different resume
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* ── TWO-COLUMN CONTENT ── */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* DESCRIPTION CARD */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] border border-slate-100 overflow-hidden">
               {/* Section header with left accent bar */}
               <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                  <div className="w-1 h-5 rounded-full bg-blue-500" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Role Description</h2>
               </div>
               <div className="p-6 md:p-8">
                  <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                     {job.description || "No description provided by company."}
                  </p>
               </div>
            </div>

            {/* KEY DETAILS SIDEBAR */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] border border-slate-100 overflow-hidden h-fit">
               <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                  <div className="w-1 h-5 rounded-full bg-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Key Details</h3>
               </div>
               <div className="p-5 space-y-0 divide-y divide-slate-100">

                  {/* Job Type */}
                  <div className="py-3 flex items-center justify-between">
                     <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Job Type</p>
                     <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full capitalize">
                        {job.type || "Job"}
                     </span>
                  </div>

                  {/* Experience Level */}
                  <div className="py-3 flex items-center justify-between">
                     <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Level</p>
                     <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full capitalize">
                        {job.experienceLevel || "Junior"}
                     </span>
                  </div>

                  {/* Work Setting */}
                  <div className="py-3 flex items-center justify-between">
                     <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Work Setting</p>
                     <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full capitalize">
                        {job.workSetting || "Remote"}
                     </span>
                  </div>

                  {/* Industry */}
                  <div className="py-3 flex items-center justify-between">
                     <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Industry</p>
                     <span className="text-xs font-medium text-slate-600 text-right max-w-[130px] truncate">
                        {job.industry || "General / Tech"}
                     </span>
                  </div>

                  {/* Required Skills */}
                  <div className="py-4">
                     <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Required Skills</p>
                     <div className="flex flex-wrap gap-1.5">
                        {(job.skills || "")
                           .split(",")
                           .filter(Boolean)
                           .map((skill, idx) => (
                              <span
                                 key={`${skill}-${idx}`}
                                 className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1"
                              >
                                 <Sparkles size={9} />
                                 {skill.trim()}
                              </span>
                           ))}
                        {!job.skills && (
                           <span className="text-xs text-slate-400 italic">Not specified</span>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {showApplyModal && (
            <div className="fixed inset-0 z-40 bg-slate-900/50 p-4 flex items-center justify-center">
               <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                     <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                           Apply for this role
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                           Select the resume you want to use for this application.
                        </p>
                     </div>
                     <button
                        onClick={() => setShowApplyModal(false)}
                        className="text-slate-400 hover:text-slate-700"
                        aria-label="Close apply dialog"
                     >
                        <X size={18} />
                     </button>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-slate-600">
                        Choose Resume
                     </label>
                     <div className="relative">
                        <FileText
                           size={16}
                           className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <select
                           value={selectedResumeId}
                           onChange={(e) => setSelectedResumeId(e.target.value)}
                           className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900"
                        >
                           <option value="">Choose a resume...</option>
                           {resumes.map((resume) => (
                              <option key={resume.id} value={resume.id}>
                                 {resume.fileName || resume.name || "Resume"}
                              </option>
                           ))}
                        </select>
                     </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                     <button
                        onClick={() => setShowApplyModal(false)}
                        className="saas-btn saas-btn-secondary"
                        disabled={submitting}
                     >
                        Cancel
                     </button>
                     <button
                        onClick={handleApply}
                        className="saas-btn saas-btn-primary"
                        disabled={submitting || !selectedResumeId || !confirmReady}
                     >
                        {submitting ? "Applying..." : "Submit Application"}
                     </button>
                  </div>

                  <label className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                     <input
                        type="checkbox"
                        checked={confirmReady}
                        onChange={(e) => setConfirmReady(e.target.checked)}
                        className="mt-0.5"
                     />
                     <span>
                        I confirm this resume is updated and I want to apply for this
                        role.
                     </span>
                  </label>
               </div>
            </div>
         )}
      </div>
   );
}
