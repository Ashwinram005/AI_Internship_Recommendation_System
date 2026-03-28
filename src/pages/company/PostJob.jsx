import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { Briefcase, MapPin, Send, AlertCircle, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function PostJob() {
   const { user } = useAuth();
   const navigate = useNavigate();
   const [job, setJob] = useState({
      type: "internship",
      title: "",
      company: user?.name || "",
      location: "",
      workSetting: "remote", // remote, onsite, hybrid
      experienceLevel: "junior", // junior, mid, senior, lead
      salaryRange: "",
      industry: "",
      skills: "",
      description: "",
      deadline: "",
   });

   useEffect(() => {
      if (user?.name) {
         setJob((prev) => ({ ...prev, company: prev.company || user.name }));
      }
   }, [user?.name]);

   const handleSubmit = async (e) => {
      e.preventDefault();
      // store job in Firestore with reference to current company
      await addDoc(collection(db, "jobs"), {
         ...job,
         companyId: auth.currentUser.uid,
         createdAt: serverTimestamp(),
         status: "active",
         active: true,
      });
      navigate("/company/manage-jobs");
   };

   return (
      <div className="max-w-3xl space-y-8">
         {/* Page Header */}
         <div>
            <h1 className="text-2xl font-semibold text-slate-900 font-[Poppins]">
               Post New Opening
            </h1>
            <p className="text-slate-500 mt-1">
               AI-powered candidate matching for faster hiring.
            </p>
         </div>

         <form onSubmit={handleSubmit} className="space-y-6">
            {/* Primary Information */}
            <div className="glass-card p-6">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center">
                     <Briefcase size={18} />
                  </div>
                  <h3 className="font-medium text-slate-900">Role Information</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                     <label className="text-sm font-medium text-slate-600">
                        Posting Type
                     </label>
                     <select
                        value={job.type}
                        onChange={(e) => setJob({ ...job, type: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm text-slate-900"
                     >
                        <option value="job">Job</option>
                        <option value="internship">Internship</option>
                     </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                     <label className="text-sm font-medium text-slate-600">
                        Job Title
                     </label>
                     <input
                        type="text"
                        required
                        placeholder="e.g. Senior Frontend Engineer"
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm text-slate-900 placeholder-slate-300"
                        value={job.title}
                        onChange={(e) => setJob({ ...job, title: e.target.value })}
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-600">
                        Company Name
                     </label>
                     <input
                        type="text"
                        required
                        placeholder="Your Brand"
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm text-slate-900 placeholder-slate-300"
                        value={job.company}
                        onChange={(e) => setJob({ ...job, company: e.target.value })}
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-600">
                        Application Deadline
                     </label>
                     <input
                        type="date"
                        required
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm text-slate-900 placeholder-slate-300"
                        value={job.deadline}
                        onChange={(e) => setJob({ ...job, deadline: e.target.value })}
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-600">
                        Work Setting
                     </label>
                     <select
                        value={job.workSetting}
                        onChange={(e) => setJob({ ...job, workSetting: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm text-slate-900"
                     >
                        <option value="remote">Remote</option>
                        <option value="onsite">On-site</option>
                        <option value="hybrid">Hybrid</option>
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-600">
                        Location / HQ
                     </label>
                     <input
                        type="text"
                        required
                        placeholder="e.g. San Francisco, CA"
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm text-slate-900 placeholder-slate-300"
                        value={job.location}
                        onChange={(e) => setJob({ ...job, location: e.target.value })}
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-600">
                        Experience Level
                     </label>
                     <select
                        value={job.experienceLevel}
                        onChange={(e) => setJob({ ...job, experienceLevel: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm text-slate-900"
                     >
                        <option value="junior">Junior / Entry Level</option>
                        <option value="mid">Mid-Level</option>
                        <option value="senior">Senior</option>
                        <option value="lead">Lead / Management</option>
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-600">
                        Salary / Stipend Range
                     </label>
                     <input
                        type="text"
                        placeholder="e.g. $50k - $80k or $500/mo"
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm text-slate-900 placeholder-slate-300"
                        value={job.salaryRange}
                        onChange={(e) => setJob({ ...job, salaryRange: e.target.value })}
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-600">
                        Industry / Category
                     </label>
                     <input
                        type="text"
                        placeholder="e.g. Technology, Finance, Design"
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm text-slate-900 placeholder-slate-300"
                        value={job.industry}
                        onChange={(e) => setJob({ ...job, industry: e.target.value })}
                     />
                  </div>
               </div>
            </div>

            {/* Requirements */}
            <div className="glass-card p-6">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                     <Sparkles size={18} />
                  </div>
                  <h3 className="font-medium text-slate-900">
                     Matching Requirements
                  </h3>
               </div>

               <div className="space-y-5">
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-600">
                        Skills (Optional)
                     </label>
                     <input
                        type="text"
                        placeholder="React, Node.js, Python (comma separated)"
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm text-slate-900 placeholder-slate-300"
                        value={job.skills}
                        onChange={(e) => setJob({ ...job, skills: e.target.value })}
                     />
                     <p className="text-xs text-slate-400">
                        Our AI uses these to calculate match scores
                     </p>
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-600">
                        Job Description
                     </label>
                     <textarea
                        required
                        rows={5}
                        placeholder="Describe the role, responsibilities, and values..."
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm text-slate-900 placeholder-slate-300 resize-none"
                        value={job.description}
                        onChange={(e) =>
                           setJob({ ...job, description: e.target.value })
                        }
                     />
                  </div>
               </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between gap-4 pt-2">
               <div className="flex items-center gap-2 text-slate-400">
                  <AlertCircle size={14} />
                  <span className="text-sm">Verify details before publishing</span>
               </div>
               <div className="flex items-center gap-3">
                  <button
                     type="button"
                     onClick={() => navigate(-1)}
                     className="saas-btn saas-btn-secondary"
                  >
                     Cancel
                  </button>
                  <button type="submit" className="saas-btn saas-btn-primary">
                     Publish Listing
                     <Send size={16} />
                  </button>
               </div>
            </div>
         </form>
      </div>
   );
}
