import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

const RESUMES_COLLECTION = "resumes";

export const MAX_RESUME_SIZE_BYTES = 700 * 1024;
export const ALLOWED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const getResumesByUser = async (userId) => {
  const q = query(collection(db, RESUMES_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getResumesByIds = async (resumeIds = []) => {
  if (!resumeIds.length) return [];

  const uniqueIds = [...new Set(resumeIds.filter(Boolean))];
  const chunks = [];
  for (let i = 0; i < uniqueIds.length; i += 10) {
    chunks.push(uniqueIds.slice(i, i + 10));
  }

  const allResults = [];
  for (const ids of chunks) {
    const q = query(collection(db, RESUMES_COLLECTION), where("__name__", "in", ids));
    const snapshot = await getDocs(q);
    allResults.push(...snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  return allResults;
};

export const saveResume = async ({ userId, fileName, base64Data, sizeBytes, mimeType }) => {
  return addDoc(collection(db, RESUMES_COLLECTION), {
    userId,
    fileName,
    base64Data,
    sizeBytes,
    mimeType,
    uploadedAt: serverTimestamp(),
  });
};

export const removeResume = async (resumeId) => {
  await deleteDoc(doc(db, RESUMES_COLLECTION, resumeId));
};
