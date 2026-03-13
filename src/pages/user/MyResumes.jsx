import { useState, useEffect } from "react";

import {
  Upload,
  FileText,
  Trash2,
  Info,
  UserRound,
  Mail,
  Save,
  Pencil,
  X,
  ExternalLink,
} from "lucide-react";
import { auth } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import {
  ALLOWED_RESUME_MIME_TYPES,
  MAX_RESUME_SIZE_BYTES,
  getResumesByUser,
  removeResume,
  saveResume,
} from "../../services/resumeService";
import {
  getProfileDisplayName,
  getProfileInitials,
} from "../../routes/routeUtils";
import {
  convertDocToHtml,
  dataUrlToBlob,
  isDocResume,
  isPdfResume,
  openResumeInNewTab,
} from "../../utils/resumePreview";

export default function MyResumes() {
  const { user, updateProfile } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [previewResume, setPreviewResume] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewBlobUrl, setPreviewBlobUrl] = useState("");
  const [previewDocHtml, setPreviewDocHtml] = useState("");

  useEffect(() => {
    // load resumes from Firestore when component mounts
    fetchResumes();
  }, []);

  useEffect(() => {
    setDisplayNameInput(getProfileDisplayName(user));
  }, [user?.name, user?.email, user?.role]);

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setError("");
    setSuccess("");

    const invalidType = files.find(
      (file) =>
        !ALLOWED_RESUME_MIME_TYPES.includes(file.type) &&
        !file.name.toLowerCase().endsWith(".doc") &&
        !file.name.toLowerCase().endsWith(".docx") &&
        !file.name.toLowerCase().endsWith(".pdf"),
    );

    if (invalidType) {
      setError("Only PDF, DOC, or DOCX files are allowed.");
      return;
    }

    const oversized = files.find((file) => file.size > MAX_RESUME_SIZE_BYTES);
    if (oversized) {
      setError(
        `File too large: ${oversized.name}. Max allowed size is ${Math.round(MAX_RESUME_SIZE_BYTES / 1024)} KB for base64 Firestore storage.`,
      );
      return;
    }

    try {
      for (const file of files) {
        const base64 = await convertToBase64(file);

        await saveResume({
          userId: auth.currentUser?.uid,
          fileName: file.name,
          base64Data: base64,
          sizeBytes: file.size,
          mimeType: file.type || "application/octet-stream",
        });
      }

      setSuccess("Resume uploaded successfully.");
      e.target.value = "";
      await fetchResumes();
    } catch (err) {
      console.error("Resume upload failed:", err);
      setError("Could not upload resume. Please try again.");
    }
  };

  const fetchResumes = async () => {
    if (!auth.currentUser?.uid) return;
    const items = await getResumesByUser(auth.currentUser.uid);
    setResumes(items);
  };

  const handleRemove = async (id) => {
    // remove document from Firestore then refresh list
    try {
      await removeResume(id);
      setSuccess("Resume deleted.");
      await fetchResumes();
    } catch (err) {
      console.error("Delete resume failed:", err);
      setError("Could not delete resume.");
    }
  };

  const handleSaveName = async () => {
    const trimmed = displayNameInput.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }

    try {
      setSavingName(true);
      setError("");
      setSuccess("");
      await updateProfile({ name: trimmed });
      setSuccess("Profile updated.");
      setEditingName(false);
    } catch (err) {
      console.error("Update profile failed:", err);
      setError("Could not update profile right now.");
    } finally {
      setSavingName(false);
    }
  };

  const viewResumeInNewTab = async (resume) => {
    try {
      await openResumeInNewTab(resume);
    } catch (err) {
      console.error("Failed to open resume:", err);
      setError(err.message || "Could not open resume in new tab.");
    }
  };

  const openPreview = async (resume) => {
    if (!resume?.base64Data) return;

    setPreviewResume(resume);
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewBlobUrl("");
    setPreviewDocHtml("");

    try {
      if (isPdfResume(resume)) {
        const blob = await dataUrlToBlob(resume.base64Data);
        const url = URL.createObjectURL(blob);
        setPreviewBlobUrl(url);
        return;
      }

      if (isDocResume(resume)) {
        const html = await convertDocToHtml(resume);
        setPreviewDocHtml(html || "<p>No readable content found.</p>");
        return;
      }

      setPreviewError("This resume format is not previewable in-app.");
    } catch (err) {
      console.error("Resume preview failed:", err);
      setPreviewError("Could not preview this resume.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewResume(null);
    setPreviewLoading(false);
    setPreviewError("");
    setPreviewDocHtml("");
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewBlobUrl("");
  };

  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const displayName = getProfileDisplayName(user);
  const initials = getProfileInitials(user);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-[Poppins]">
            Profile
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your account details and resumes in one place.
          </p>
        </div>
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
              <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-semibold">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              {editingName ? (
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900"
                />
              ) : (
                <p className="text-base font-semibold text-slate-900 truncate">
                  {displayName}
                </p>
              )}
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <Mail size={14} /> {user?.email || "-"}
              </p>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <UserRound size={12} />
                {user?.role === "company" ? "Employer" : "Job Seeker"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {!editingName ? (
              <button
                onClick={() => setEditingName(true)}
                className="saas-btn saas-btn-secondary py-2 px-3 text-sm"
              >
                <Pencil size={14} /> Edit Name
              </button>
            ) : (
              <>
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="saas-btn saas-btn-primary py-2 px-3 text-sm"
                >
                  <Save size={14} /> {savingName ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setDisplayNameInput(displayName);
                  }}
                  className="saas-btn saas-btn-secondary py-2 px-3 text-sm"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Resume Management
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Upload, view, and remove resumes used for applications.
              </p>
            </div>
            <label className="saas-btn saas-btn-primary">
              <Upload size={16} />
              Upload Resume
              <input
                type="file"
                multiple
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="mt-3 text-xs text-slate-400">
            Allowed: PDF, DOC, DOCX. Max size:{" "}
            {Math.round(MAX_RESUME_SIZE_BYTES / 1024)} KB per file.
          </div>

          <div className="mt-4 space-y-3">
            {resumes.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                <div className="w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                  <Info size={20} />
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  No resumes uploaded yet.
                </p>
              </div>
            ) : (
              resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 text-left min-w-0">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {resume.fileName || resume.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(resume.sizeBytes || 0) > 0
                          ? `${Math.round(resume.sizeBytes / 1024)} KB`
                          : "Size unavailable"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openPreview(resume)}
                      className="saas-btn saas-btn-secondary py-2 px-3 text-sm"
                    >
                      <FileText size={14} /> Preview
                    </button>
                    <button
                      onClick={() => viewResumeInNewTab(resume)}
                      className="saas-btn saas-btn-secondary py-2 px-3 text-sm"
                    >
                      <ExternalLink size={14} /> New Tab
                    </button>

                    <button
                      onClick={() => handleRemove(resume.id)}
                      className="saas-btn saas-btn-secondary py-2 px-3 text-sm text-red-500"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
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

      {previewResume && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Resume Preview
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {previewResume.fileName || previewResume.name || "Resume"}
                </p>
              </div>
              <button
                onClick={closePreview}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Close resume preview"
              >
                <X size={18} />
              </button>
            </div>

            {previewLoading && (
              <div className="glass-card p-6 text-sm text-slate-500">
                Preparing preview...
              </div>
            )}

            {!previewLoading && previewError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                {previewError}
              </div>
            )}

            {!previewLoading && previewBlobUrl && (
              <div className="border border-slate-200 rounded-xl overflow-hidden h-[70vh] bg-slate-50">
                <iframe
                  title="Resume Preview"
                  src={previewBlobUrl}
                  className="w-full h-full"
                />
              </div>
            )}

            {!previewLoading && previewDocHtml && (
              <div
                className="border border-slate-200 rounded-xl p-5 prose prose-slate max-w-none"
                // Controlled conversion from mammoth HTML output.
                dangerouslySetInnerHTML={{ __html: previewDocHtml }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
