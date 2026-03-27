import { useEffect, useState } from "react";
import { Building2, Globe, Mail, Save, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getCompanyPostings } from "../../services/postingService";
import { getApplicationsByJobIds } from "../../services/applicationService";
import {
  getProfileDisplayName,
  getProfileInitials,
} from "../../routes/routeUtils";

export default function CompanyProfile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: "",
    website: "",
    industry: "",
    companySize: "",
    location: "",
    about: "",
  });
  const [stats, setStats] = useState({
    activePostings: 0,
    totalApplications: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setForm({
      name: user?.name || "",
      website: user?.website || "",
      companySize: user?.companySize || "",
      location: user?.location || "",
      about: user?.about || user?.tagline || "",
    });
  }, [user?.name, user?.website, user?.industry, user?.companySize, user?.location, user?.about, user?.tagline]);

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.uid) return;

      try {
        const jobs = await getCompanyPostings(user.uid);
        const apps = await getApplicationsByJobIds(
          jobs.map((job) => job.id),
          { companyId: user.uid },
        );
        setStats({
          activePostings: jobs.filter((job) => job.status === "active").length,
          totalApplications: apps.length,
        });
      } catch (err) {
        console.error("Failed to load company profile stats:", err);
      }
    };

    loadStats();
  }, [user?.uid]);

  const onSave = async () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("Company name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await updateProfile({
        name: trimmedName,
        website: form.website.trim(),
        industry: form.industry.trim(),
        companySize: form.companySize,
        location: form.location.trim(),
        about: form.about.trim(),
      });

      setSuccess("Company profile updated.");
    } catch (err) {
      console.error("Profile update failed:", err);
      setError("Could not update company profile.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = getProfileDisplayName(user);
  const initials = getProfileInitials(user);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 font-[Poppins]">
          Company Profile
        </h1>
        <p className="text-slate-500 mt-1">
          Manage your company details, brand presence, and profile settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-5 lg:col-span-1">
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                className="w-14 h-14 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 font-semibold">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-900 truncate">
                {displayName}
              </p>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1 truncate">
                <Mail size={14} /> {user?.email || "-"}
              </p>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <UserRound size={12} /> Employer Account
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Active postings</span>
              <span className="font-semibold text-slate-900">
                {stats.activePostings}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Applications received</span>
              <span className="font-semibold text-slate-900">
                {stats.totalApplications}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Business Details
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Keep your company information up-to-date for candidates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-600">
                Company Name
              </label>
              <div className="relative">
                <Building2
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">
                Industry
              </label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, industry: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900"
                placeholder="Software, Finance, Healthcare..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">
                Website
              </label>
              <div className="relative">
                <Globe
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, website: e.target.value }))
                  }
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900"
                  placeholder="https://company.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">
                Company Size
              </label>
              <select
                value={form.companySize}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, companySize: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900"
              >
                <option value="">Select size...</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="500+">500+</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">
                Headquarters
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, location: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900"
                placeholder="City, Country"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-600">
                About Company
              </label>
              <textarea
                rows={4}
                value={form.about}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, about: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 resize-none"
                placeholder="Short company overview shown to candidates..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={onSave}
              disabled={saving}
              className="saas-btn saas-btn-primary"
            >
              <Save size={16} /> {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
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
    </div>
  );
}
