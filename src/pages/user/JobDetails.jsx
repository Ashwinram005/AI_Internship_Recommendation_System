import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
   ArrowLeft,
   ArrowUpRight,
   Building2,
   CalendarDays,
   FileText,
   Globe,
   MapPin,
   Sparkles,
   X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
   createApplication,
   getApplicationsByUser,
} from "../../services/applicationService";
import { getPostingById } from "../../services/postingService";
import { getResumesByUser } from "../../services/resumeService";

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

   if (loading) {
      return (
         <div className="max-w-5xl">
            <div className="glass-card p-8 text-sm text-slate-500">
               Loading job details...
            </div>
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

         <div className="glass-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
               <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide">
                     <span className="bg-slate-100 px-2 py-0.5 rounded">
                        {job.type || "internship"}
                     </span>
                     <span className="bg-slate-100 px-2 py-0.5 rounded">
                        {job.experienceLevel || "Junior"}
                     </span>
                     <span>Job Board Listing</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mt-2 font-[Poppins]">
                     {job.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
                     <span className="inline-flex items-center gap-1.5">
                        <Building2 size={14} /> {job.company || "Unknown Company"}
                     </span>
                     <span className="inline-flex items-center gap-1.5">
                        <MapPin size={14} /> {job.location || "Global"} ({job.workSetting || "Remote"})
                     </span>
                     {job.salaryRange && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                           <WalletCards size={14} /> {job.salaryRange}
                        </span>
                     )}
                     <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={14} /> Apply by {deadlineLabel}
                     </span>
                  </div>
               </div>

               <div className="flex flex-col items-start md:items-end gap-2">
                  <span
                     className={`saas-badge ${job.status === "active" ? "badge-success" : "badge-warning"}`}
                  >
                     {job.status === "active"
                        ? "Open for Applications"
                        : job.status === "hold"
                          ? "On Hold: Not accepting new applications"
                          : "Applications Closed"}
                  </span>
                  {appliedJobIds.has(job.id) ? (
                     <span className="saas-badge badge-info">Already Applied</span>
                  ) : (
                     <button
                        onClick={openApplyModal}
                        disabled={!canApply}
                        className="saas-btn saas-btn-primary disabled:opacity-50"
                     >
                        Apply with Resume
                        <ArrowUpRight size={16} />
                     </button>
                  )}
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 lg:col-span-2 space-y-4">
               <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                     Role Description
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                     Complete details for this position.
                  </p>
               </div>
               <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {job.description || "No description provided by company."}
               </p>
            </div>

            <div className="glass-card p-6 space-y-4">
               <h3 className="text-lg font-semibold text-slate-900">Key Details</h3>
               <div className="space-y-3 text-sm">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                     <p className="text-slate-400 text-xs uppercase tracking-wide">
                        Job Type
                     </p>
                     <p className="text-slate-700 font-medium mt-1 uppercase">
                        {job.type || "job"}
                     </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                     <p className="text-slate-400 text-xs uppercase tracking-wide">
                        Required Skills
                     </p>
                     <div className="flex flex-wrap gap-1.5 mt-2">
                        {(job.skills || "")
                           .split(",")
                           .filter(Boolean)
                           .map((skill, idx) => (
                              <span
                                 key={`${skill}-${idx}`}
                                 className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-flex items-center gap-1"
                              >
                                 <Sparkles size={10} />
                                 {skill.trim()}
                              </span>
                           ))}
                        {!job.skills && (
                           <span className="text-slate-500">Not specified</span>
                        )}
                     </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                     <p className="text-slate-400 text-xs uppercase tracking-wide">
                        Experience Level
                     </p>
                     <p className="text-slate-700 font-medium mt-1 capitalize">
                        {job.experienceLevel || "Junior"}
                     </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                     <p className="text-slate-400 text-xs uppercase tracking-wide">
                        Industry / Category
                     </p>
                     <p className="text-slate-700 font-medium mt-1">
                        {job.industry || "General / Tech"}
                     </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                     <p className="text-slate-400 text-xs uppercase tracking-wide">
                        Work Setting
                     </p>
                     <p className="text-slate-700 font-medium mt-1 capitalize">
                        {job.workSetting || "Remote"}
                     </p>
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
