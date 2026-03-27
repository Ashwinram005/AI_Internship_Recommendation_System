import {
  arrayUnion,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getPostingById } from "./postingService";

const APPLICATIONS_COLLECTION = "applications";

export const APPLICATION_STATUSES = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
];

const STATUS_LABELS = {
  submitted: "Submitted",
  reviewing: "In Review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offered: "Offered",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const COMPANY_TRANSITIONS = {
  submitted: ["reviewing", "shortlisted", "rejected"],
  reviewing: ["shortlisted", "interview", "rejected"],
  shortlisted: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "rejected"],
  hired: [],
  // Allow reconsideration for rejected profiles.
  rejected: ["reviewing"],
  withdrawn: [],
};

const USER_WITHDRAW_ALLOWED = new Set([
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offered",
  "rejected",
]);

const LEGACY_STATUS_MAP = {
  under_review: "reviewing",
  in_review: "reviewing",
  interview_scheduled: "interview",
  accepted: "hired",
};

export const normalizeApplicationStatus = (status) => {
  const normalized = (status || "submitted").toLowerCase();
  return LEGACY_STATUS_MAP[normalized] || normalized;
};

export const getApplicationStatusLabel = (status) => {
  const normalized = normalizeApplicationStatus(status);
  return STATUS_LABELS[normalized] || STATUS_LABELS.submitted;
};

export const getNextCompanyStatuses = (status) => {
  const normalized = normalizeApplicationStatus(status);
  return COMPANY_TRANSITIONS[normalized] || [];
};

export const canWithdrawApplicationStatus = (status) => {
  const normalized = normalizeApplicationStatus(status);
  return USER_WITHDRAW_ALLOWED.has(normalized);
};

export const canDeleteApplicationRecordStatus = (status) => {
  const normalized = normalizeApplicationStatus(status);
  return getNextCompanyStatuses(normalized).length === 0;
};

const assertValidStatus = (status) => {
  if (!APPLICATION_STATUSES.includes(status)) {
    throw new Error("Invalid application status.");
  }
};

export const createApplication = async ({
  jobId,
  userId,
  companyId,
  resumeId,
  resumeName,
  resumeSnapshotBase64,
  resumeMimeType,
  resumeSizeBytes,
}) => {
  if (!jobId || !userId || !resumeId || !resumeName) {
    throw new Error("Job and resume selection are required to apply.");
  }

  const posting = await getPostingById(jobId);
  if (!posting) {
    throw new Error("This posting no longer exists.");
  }

  if (posting.status !== "active") {
    throw new Error("This posting is not accepting applications.");
  }

  if (posting.deadline) {
    const deadline = new Date(posting.deadline);
    const now = new Date();
    if (!Number.isNaN(deadline.getTime()) && deadline < now) {
      throw new Error("Application deadline has passed for this posting.");
    }
  }

  if (!resumeSnapshotBase64) {
    throw new Error("Resume data is unavailable. Please reselect your resume.");
  }

  const existingQuery = query(
    collection(db, APPLICATIONS_COLLECTION),
    where("jobId", "==", jobId),
    where("userId", "==", userId),
  );
  const existingSnap = await getDocs(existingQuery);

  const hasActiveApplication = existingSnap.docs.some((snap) => {
    const status = normalizeApplicationStatus(snap.data().status);
    return status !== "withdrawn";
  });

  if (hasActiveApplication) {
    throw new Error("You have already applied to this posting.");
  }

  return addDoc(collection(db, APPLICATIONS_COLLECTION), {
    jobId,
    userId,
    companyId,
    resumeId: resumeId || null,
    resumeName,
    resumeSnapshotBase64: resumeSnapshotBase64 || null,
    resumeMimeType: resumeMimeType || null,
    resumeSizeBytes: Number.isFinite(resumeSizeBytes) ? resumeSizeBytes : null,
    status: "submitted",
    dateApplied: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getApplicationsByUser = async (userId) => {
  const q = query(collection(db, APPLICATIONS_COLLECTION), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, status: normalizeApplicationStatus(data.status) };
  });
};

export const getApplicationsByCompany = async (companyId) => {
  const q = query(
    collection(db, APPLICATIONS_COLLECTION),
    where("companyId", "==", companyId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, status: normalizeApplicationStatus(data.status) };
  });
};

export const getApplicationsByJobIds = async (jobIds = [], constraints = {}) => {
  if (!jobIds.length) return [];

  // Firestore where-in supports max 10 IDs, so split in chunks.
  const chunks = [];
  for (let i = 0; i < jobIds.length; i += 10) {
    chunks.push(jobIds.slice(i, i + 10));
  }

  const allResults = [];
  for (const ids of chunks) {
    let q = query(collection(db, APPLICATIONS_COLLECTION), where("jobId", "in", ids));

    // Satisfy security rules by adding explicit ownership filters if provided
    if (constraints.companyId) {
      q = query(q, where("companyId", "==", constraints.companyId));
    }
    if (constraints.userId) {
      q = query(q, where("userId", "==", constraints.userId));
    }

    const snap = await getDocs(q);
    allResults.push(
      ...snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data, status: normalizeApplicationStatus(data.status) };
      }),
    );
  }

  return allResults;
};

export const getAllApplications = async () => {
  const snap = await getDocs(collection(db, APPLICATIONS_COLLECTION));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, status: normalizeApplicationStatus(data.status) };
  });
};

export const updateApplicationStatus = async (applicationId, nextStatus, meta = {}) => {
  const normalizedNext = normalizeApplicationStatus(nextStatus);
  assertValidStatus(normalizedNext);

  const appRef = doc(db, APPLICATIONS_COLLECTION, applicationId);
  const snap = await getDoc(appRef);
  if (!snap.exists()) {
    throw new Error("Application not found.");
  }

  const currentStatus = normalizeApplicationStatus(snap.data().status);
  const application = snap.data();

  if (meta.changedByRole === "company" && meta.changedById) {
    if (application.companyId !== meta.changedById) {
      throw new Error("You are not authorized to update this application.");
    }
  }

  const allowedNext = getNextCompanyStatuses(currentStatus);

  if (currentStatus !== normalizedNext && !allowedNext.includes(normalizedNext)) {
    throw new Error("Invalid status transition for this application.");
  }

  const reason = (meta.reason || "").trim();
  const note = (meta.note || "").trim();

  if (normalizedNext === "rejected" && !reason) {
    throw new Error("Rejection reason is required.");
  }

  const statusHistoryEntry = {
    from: currentStatus,
    to: normalizedNext,
    reason: reason || null,
    note: note || null,
    changedByRole: meta.changedByRole || null,
    changedById: meta.changedById || null,
    changedAt: new Date().toISOString(),
  };

  await updateDoc(appRef, {
    status: normalizedNext,
    statusReason: reason || null,
    statusNote: note || null,
    statusHistory: arrayUnion(statusHistoryEntry),
    updatedAt: serverTimestamp(),
  });
};

export const withdrawApplication = async (applicationId) => {
  const appRef = doc(db, APPLICATIONS_COLLECTION, applicationId);
  const snap = await getDoc(appRef);
  if (!snap.exists()) {
    throw new Error("Application not found.");
  }

  const status = normalizeApplicationStatus(snap.data().status);
  if (!canWithdrawApplicationStatus(status)) {
    throw new Error("This application can no longer be withdrawn.");
  }

  await updateDoc(appRef, {
    status: "withdrawn",
    statusReason: "Withdrawn by candidate",
    statusNote: null,
    statusHistory: arrayUnion({
      from: status,
      to: "withdrawn",
      reason: "Withdrawn by candidate",
      note: null,
      changedByRole: "user",
      changedById: snap.data().userId || null,
      changedAt: new Date().toISOString(),
    }),
    updatedAt: serverTimestamp(),
  });
};

export const deleteApplicationRecord = async (applicationId, options = {}) => {
  const appRef = doc(db, APPLICATIONS_COLLECTION, applicationId);
  const snap = await getDoc(appRef);
  if (!snap.exists()) {
    throw new Error("Application not found.");
  }

  const application = snap.data();
  const status = normalizeApplicationStatus(application.status);

  if (!canDeleteApplicationRecordStatus(status)) {
    throw new Error("Only final applications can be permanently deleted.");
  }

  if (options.actorCompanyId && application.companyId !== options.actorCompanyId) {
    throw new Error("You are not authorized to delete this application.");
  }

  await deleteDoc(appRef);
};
