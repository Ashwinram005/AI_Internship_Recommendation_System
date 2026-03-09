import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
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

export const getVisiblePostingsForCandidates = async () => {
  const snap = await getDocs(collection(db, JOBS_COLLECTION));
  return snap.docs
    .map(hydratePosting)
    .filter((posting) => posting.status !== "deleted");
};

export const getActivePostings = async () => {
  const snap = await getDocs(collection(db, JOBS_COLLECTION));
  return snap.docs
    .map(hydratePosting)
    .filter((posting) => posting.status === "active");
};

export const getCompanyPostings = async (companyId) => {
  const snap = await getDocs(collection(db, JOBS_COLLECTION));
  return snap.docs
    .map(hydratePosting)
    .filter((posting) => posting.companyId === companyId);
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
