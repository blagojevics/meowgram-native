import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { User } from "../@types/chat";

/**
 * Get user profile by ID (can be Firebase UID or Firestore document ID)
 */
export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    console.log("[UserService] Getting profile for:", userId);

    // First try direct document lookup
    const userDoc = await getDoc(doc(db, "users", userId));

    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log("[UserService] Found user by doc ID:", data.username);
      return {
        uid: data.uid || userId,
        username: data.username,
        displayName: data.displayName || data.username,
        email: data.email,
        avatarUrl: data.avatarUrl || data.profilePic || "",
        bio: data.bio || "",
        isOnline: data.isOnline || false,
        lastSeen: data.lastSeen || 0,
      } as User;
    }

    // If not found by doc ID, try querying by uid field
    const { collection, query, where, getDocs } = await import(
      "firebase/firestore"
    );
    const q = query(collection(db, "users"), where("uid", "==", userId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      console.log("[UserService] Found user by UID:", data.username);
      return {
        uid: data.uid,
        username: data.username,
        displayName: data.displayName || data.username,
        email: data.email,
        avatarUrl: data.avatarUrl || data.profilePic || "",
        bio: data.bio || "",
        isOnline: data.isOnline || false,
        lastSeen: data.lastSeen || 0,
      } as User;
    }

    console.warn("[UserService] User not found:", userId);
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

/**
 * Get multiple user profiles
 */
export const getUserProfiles = async (userIds: string[]): Promise<User[]> => {
  try {
    const profiles: User[] = [];

    for (const userId of userIds) {
      const profile = await getUserProfile(userId);
      if (profile) {
        profiles.push(profile);
      }
    }

    return profiles;
  } catch (error) {
    console.error("Error getting user profiles:", error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>
): Promise<void> => {
  try {
    const allowedFields = [
      "displayName",
      "bio",
      "avatarUrl",
      "isOnline",
      "lastSeen",
    ];

    const filteredUpdates: any = {};
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key as keyof User];
      }
    });

    filteredUpdates.lastUpdated = Date.now();

    await updateDoc(doc(db, "users", userId), filteredUpdates);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * Search users by username
 */
export const searchUsersByUsername = async (
  username: string
): Promise<User[]> => {
  try {
    console.log("[UserService] Searching for username:", username);
    const {
      collection,
      query: firestoreQuery,
      where,
      getDocs,
    } = await import("firebase/firestore");

    // Firestore doesn't have full-text search, so we need to do prefix search
    // This is a simple implementation - for production, consider Algolia or similar
    const q = firestoreQuery(
      collection(db, "users"),
      where("username", ">=", username.toLowerCase()),
      where("username", "<=", username.toLowerCase() + "\uf8ff")
    );

    const snapshot = await getDocs(q);
    console.log("[UserService] Found", snapshot.docs.length, "users");
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: data.uid,
        username: data.username,
        displayName: data.displayName || data.username,
        email: data.email,
        avatarUrl: data.avatarUrl || data.profilePic || "",
        bio: data.bio || "",
        isOnline: data.isOnline || false,
        lastSeen: data.lastSeen || 0,
      } as User;
    });
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
};
