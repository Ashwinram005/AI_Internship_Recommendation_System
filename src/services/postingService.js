import {
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

const JOBS_COLLECTION = "jobs";

export const normalizePostingStatus = (posting) => {
  if (posting.status) return posting.status;
  return posting.active === false ? "disabled" : "active";
};

export const hydratePosting = (docSnap) => {
  const data = docSnap.data();
  const status = normalizePostingStatus(data);
  return {
    id: docSnap.id,
    ...data,
    status,
    active: status === "active",
  };
};

export const getPostingById = async (postingId) => {
  const postingRef = doc(db, JOBS_COLLECTION, postingId);
  const snap = await getDoc(postingRef);
  if (!snap.exists()) return null;
  return hydratePosting(snap);
};

export const getAllPostings = async () => {
  const snap = await getDocs(collection(db, JOBS_COLLECTION));
  return snap.docs.map(hydratePosting);
};

export const getVisiblePostingsForCandidates = async () => {
  const q = query(
    collection(db, JOBS_COLLECTION),
    where("status", "in", ["active", "hold"]),
  );
  const snap = await getDocs(q);
  return snap.docs.map(hydratePosting);
};

export const getActivePostings = async () => {
  const q = query(collection(db, JOBS_COLLECTION), where("status", "==", "active"));
  const snap = await getDocs(q);
  return snap.docs.map(hydratePosting);
};

export const getCompanyPostings = async (companyId) => {
  if (!companyId) return [];
  const q = query(
    collection(db, JOBS_COLLECTION),
    where("companyId", "==", companyId),
  );
  const snap = await getDocs(q);
  return snap.docs.map(hydratePosting);
};

export const setPostingStatus = async (postingId, status) => {
  const postingRef = doc(db, JOBS_COLLECTION, postingId);
  await updateDoc(postingRef, {
    status,
    active: status === "active",
    updatedAt: serverTimestamp(),
  });
};

export const deletePostingPermanently = async (postingId) => {
  const postingRef = doc(db, JOBS_COLLECTION, postingId);
  await deleteDoc(postingRef);
};
