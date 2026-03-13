import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const resolveUserProfile = async (firebaseUser) => {
    if (!firebaseUser) return null;

    const { uid, email, displayName, photoURL } = firebaseUser;
    const companyDoc = await getDoc(doc(db, "companies", uid));
    if (companyDoc.exists()) {
      const data = companyDoc.data();
      return {
        uid,
        email,
        name: data.name || displayName || "Company",
        role: "company",
        photoURL: data.photoURL || photoURL || "",
        website: data.website || "",
        industry: data.industry || "",
        about: data.about || "",
      };
    }

    const userDoc = await getDoc(doc(db, "users", uid));

    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        uid,
        email,
        name: data.name || displayName || "User",
        role: data.role || "user",
        photoURL: data.photoURL || photoURL || "",
        headline: data.headline || "",
        phone: data.phone || "",
        location: data.location || "",
        about: data.about || "",
        skills: data.skills || "",
      };
    }

    // Default first-time social sign-in to candidate profile.
    await setDoc(
      doc(db, "users", uid),
      {
        name: displayName || "User",
        email,
        role: "user",
        photoURL: photoURL || "",
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      uid,
      email,
      name: displayName || "User",
      role: "user",
      photoURL: photoURL || "",
      headline: "",
      phone: "",
      location: "",
      about: "",
      skills: "",
    };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          return;
        }

        const appUser = await resolveUserProfile(firebaseUser);
        setUser(appUser);
      } catch (err) {
        console.error("Failed to resolve user profile:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = (userData) => {
    // Kept for compatibility with existing code paths.
    setUser(userData);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const updateProfile = async (updates) => {
    if (!user?.uid) throw new Error("User session not found");

    const collectionName = user.role === "company" ? "companies" : "users";
    const profileRef = doc(db, collectionName, user.uid);

    await setDoc(
      profileRef,
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    setUser((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        resolveUserProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
