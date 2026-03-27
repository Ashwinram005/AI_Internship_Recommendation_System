import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

const USERS_COLLECTION = "users";

export const getUsersByIds = async (userIds = []) => {
  if (!userIds.length) return [];

  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const chunks = [];
  for (let i = 0; i < uniqueIds.length; i += 10) {
    chunks.push(uniqueIds.slice(i, i + 10));
  }

  const allUsers = [];
  for (const ids of chunks) {
    const q = query(collection(db, USERS_COLLECTION), where("__name__", "in", ids));
    const snap = await getDocs(q);
    allUsers.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  return allUsers;
};
export const getAllUsers = async () => {
  const q = query(collection(db, USERS_COLLECTION), where("role", "==", "user"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getAllCompanies = async () => {
  const snap = await getDocs(collection(db, "companies"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
