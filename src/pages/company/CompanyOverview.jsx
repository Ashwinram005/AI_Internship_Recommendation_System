import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
   BarChart3,
   Users,
   Briefcase,
   Activity,
   ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getApplicationsByJobIds } from "../../services/applicationService";
import { getCompanyPostings } from "../../services/postingService";

export default function CompanyOverview() {
   const { user } = useAuth();
   const [stats, setStats] = useState({ activeJobs: 0, candidates: 0 });
   const [recentApps, setRecentApps] = useState([]);
   const [recentJobs, setRecentJobs] = useState([]);

   useEffect(() => {
      const loadData = async () => {
         if (!user?.uid) return;

         const jobs = await getCompanyPostings(user.uid);
         const jobIds = jobs.map((job) => job.id);
         const filteredApps = await getApplicationsByJobIds(jobIds, {
            companyId: user.uid,
         });

         setStats({
            activeJobs: jobs.filter((j) => j.status === "active").length,
            candidates: filteredApps.length,
         });
         setRecentJobs(
            jobs
               .sort(
                  (a, b) =>
                     (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
               )
               .slice(0, 3),
         );
         setRecentApps(
            filteredApps
               .sort(
                  (a, b) =>
                     (b.dateApplied?.seconds || 0) - (a.dateApplied?.seconds || 0),
               )
               .slice(0, 3),
         );
      };

      loadData();
   }, [user?.uid]);

   const cards = [
      {
         label: "Active Listings",
         value: stats.activeJobs,
         icon: Briefcase,
         color: "text-indigo-500",
         bg: "bg-indigo-50",
      },
      {
         label: "Total Candidates",
         value: stats.candidates,
         icon: Users,
         color: "text-emerald-500",
         bg: "bg-emerald-50",
      },
      {
         label: "Engagement Rate",
         value: "84%",
         icon: BarChart3,
         color: "text-amber-500",
         bg: "bg-amber-50",
      },
   ];

   return (
      <div className="max-w-5xl space-y-8">
         {/* Page Header */}
         <div>
            <h1 className="text-2xl font-semibold text-slate-900 font-[Poppins]">
               Overview
            </h1>
            <p className="text-slate-500 mt-1">
               Welcome back! Here's what's happening.
            </p>
         </div>

         {/* KPI Section */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {cards.map((c) => {
               const Icon = c.icon;
               return (
                  <div key={c.label} className="glass-card p-5">
                     <div className="flex items-start justify-between">
                        <div>
                           <p className="text-sm text-slate-500">{c.label}</p>
                           <p className="text-2xl font-semibold text-slate-900 mt-1">
                              {c.value}
                           </p>
                        </div>
                        <div className={`p-2.5 rounded-lg ${c.bg}`}>
                           <Icon size={20} className={c.color} />
                        </div>
                     </div>
                  </div>
               );
            })}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Candidates */}
            <div className="glass-card lg:col-span-2 space-y-6">
               <div>
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                     <h3 className="font-medium text-slate-900">Recent Applications</h3>
                     <Link
                        to="/company/manage-jobs"
                        className="text-sm text-indigo-500 hover:text-indigo-400 font-medium flex items-center gap-1"
                     >
                        View all <ArrowUpRight size={14} />
                     </Link>
                  </div>
                  <div className="divide-y divide-slate-100">
                     {recentApps.length === 0 ? (
                        <div className="p-10 text-center">
                           <p className="text-sm text-slate-500">
                              No recent applications found.
                           </p>
                        </div>
                     ) : (
                        recentApps.map((app, i) => (
                           <div
                              key={i}
                              className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                           >
                              <div className="flex items-center gap-3">
                                 <div className="w-9 h-9 bg-slate-50 rounded-full flex items-center justify-center font-medium text-slate-500 text-sm">
                                    {app.resumeName.charAt(0).toUpperCase()}
                                 </div>
                                 <div>
                                    <p className="text-sm font-medium text-slate-900">
                                       {app.resumeName}
                                    </p>
                                    <p className="text-xs text-slate-500">Job #{app.jobId}</p>
                                 </div>
                              </div>
                              <span className="saas-badge badge-info">New</span>
                           </div>
                        ))
                     )}
                  </div>
               </div>

               <div>
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                     <h3 className="font-medium text-slate-900">Recent Job Postings</h3>
                     <Link
                        to="/company/manage-jobs"
                        className="text-sm text-indigo-500 hover:text-indigo-400 font-medium flex items-center gap-1"
                     >
                        Manage listings <ArrowUpRight size={14} />
                     </Link>
                  </div>
                  <div className="divide-y divide-slate-100">
                     {recentJobs.length === 0 ? (
                        <div className="p-10 text-center">
                           <p className="text-sm text-slate-500">
                              No job postings yet.
                           </p>
                        </div>
                     ) : (
                        recentJobs.map((job, i) => (
                           <div
                              key={i}
                              className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                           >
                              <div className="flex items-center gap-3">
                                 <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-medium text-sm">
                                    <Briefcase size={16} />
                                 </div>
                                 <div>
                                    <p className="text-sm font-medium text-slate-900">
                                       {job.title}
                                    </p>
                                    <p className="text-xs text-slate-500 capitalize">
                                       {job.type || "Full-time"} · {job.status}
                                    </p>
                                 </div>
                              </div>
                              <ArrowUpRight size={14} className="text-slate-300" />
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-5">
               <div className="glass-card p-5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50" />
                  <div className="relative">
                     <h3 className="font-medium text-slate-900">Post a new job</h3>
                     <p className="text-sm text-slate-400 mt-1">
                        Reach qualified candidates with AI-enhanced matching.
                     </p>
                     <Link
                        to="/company/post-job"
                        className="inline-flex items-center mt-4 saas-btn saas-btn-primary px-4 py-2 rounded-lg text-sm font-medium"
                     >
                        Create listing
                     </Link>
                  </div>
               </div>

               <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                        <Activity size={20} />
                     </div>
                     <div>
                        <h4 className="text-sm font-medium text-slate-900">
                           Analytics
                        </h4>
                        <p className="text-xs text-slate-500">View performance data</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
