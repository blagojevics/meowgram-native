import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    profile?: { name: string; username: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  googleSignIn: (promptAsync: any) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    console.log("AuthContext login called with:", email);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("Firebase login successful:", result.user.email);
    } catch (error) {
      console.error("Firebase login error:", error);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    profile?: { name: string; username: string }
  ) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (profile) {
      await updateProfile(res.user, { displayName: profile.username });
      await setDoc(doc(db, "users", res.user.uid), {
        uid: res.user.uid,
        username: profile.username.toLowerCase(),
        displayName: profile.name,
        email: email,
        avatarUrl: "",
        bio: "",
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        onboardingComplete: false,
        createdAt: serverTimestamp(),
      });
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const googleSignIn = async (promptAsync: any) => {
    try {
      if (!promptAsync) {
        throw new Error("Google auth not initialized");
      }

      // The promptAsync is already called in the LoginScreen
      // We just need to get the ID token and authenticate with Firebase
      const { signInWithGoogleAsync } = await import("../services/googleAuth");
      const { idToken } = await signInWithGoogleAsync(promptAsync);

      if (!idToken) throw new Error("No id token returned from Google");

      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);

      // Create user doc if new
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          uid: user.uid,
          username: user.displayName?.toLowerCase().replace(/\s+/g, "") || "",
          displayName: user.displayName || user.email,
          email: user.email,
          avatarUrl: user.photoURL || "",
          bio: "",
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          onboardingComplete: false,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Google sign-in failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, googleSignIn }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
