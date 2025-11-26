import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { UserPresence, TypingIndicator } from "../@types/chat";

/**
 * Update user's online presence
 */
export const updateUserPresence = async (
  userId: string,
  isOnline: boolean,
  status: "available" | "away" | "busy" | "offline" = "available",
  currentConversationId?: string
): Promise<void> => {
  try {
    const presenceData: Partial<UserPresence> = {
      uid: userId,
      isOnline,
      lastSeen: Date.now(),
      status: isOnline ? status : "offline",
    };

    if (currentConversationId) {
      presenceData.currentConversationId = currentConversationId;
    }

    await setDoc(doc(db, "userPresence", userId), presenceData, {
      merge: true,
    });
  } catch (error) {
    console.error("Error updating user presence:", error);
    throw error;
  }
};

/**
 * Get user's presence status
 */
export const getUserPresence = async (
  userId: string
): Promise<UserPresence | null> => {
  try {
    const presenceDoc = await (
      await import("firebase/firestore")
    ).getDoc(doc(db, "userPresence", userId));

    if (presenceDoc.exists()) {
      return presenceDoc.data() as UserPresence;
    }
    return null;
  } catch (error) {
    console.error("Error getting user presence:", error);
    throw error;
  }
};

/**
 * Listen to user's presence changes
 */
export const listenToUserPresence = (
  userId: string,
  callback: (presence: UserPresence | null) => void
): (() => void) => {
  try {
    const unsubscribe = onSnapshot(
      doc(db, "userPresence", userId),
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as UserPresence);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error("Error listening to user presence:", error);
        callback(null);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up presence listener:", error);
    return () => {};
  }
};

/**
 * Listen to presence of multiple users
 */
export const listenToUsersPresence = (
  userIds: string[],
  callback: (presences: { [userId: string]: UserPresence | null }) => void
): (() => void) => {
  const unsubscribers: Array<() => void> = [];
  const presences: { [userId: string]: UserPresence | null } = {};

  userIds.forEach((userId) => {
    const unsubscribe = listenToUserPresence(userId, (presence) => {
      presences[userId] = presence;
      callback(presences);
    });
    unsubscribers.push(unsubscribe);
  });

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
};

/**
 * Set typing indicator
 */
export const setTypingIndicator = async (
  conversationId: string,
  userId: string,
  username: string,
  isTyping: boolean
): Promise<void> => {
  try {
    const typingId = `${conversationId}_${userId}`;

    if (isTyping) {
      const typingData: TypingIndicator = {
        userId,
        username,
        timestamp: Date.now(),
        conversationId,
      };

      await setDoc(doc(db, "typingIndicators", typingId), typingData);
    } else {
      await deleteDoc(doc(db, "typingIndicators", typingId));
    }
  } catch (error) {
    console.error("Error setting typing indicator:", error);
    throw error;
  }
};

/**
 * Listen to typing indicators in a conversation
 */
export const listenToTypingIndicators = (
  conversationId: string,
  callback: (typingUsers: TypingIndicator[]) => void
): (() => void) => {
  try {
    const q = query(
      collection(db, "typingIndicators"),
      where("conversationId", "==", conversationId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const typingUsers = snapshot.docs.map(
          (doc) => doc.data() as TypingIndicator
        );

        // Filter out old typing indicators (older than 5 seconds)
        const now = Date.now();
        const validTypingUsers = typingUsers.filter(
          (indicator) => now - indicator.timestamp < 5000
        );

        callback(validTypingUsers);
      },
      (error) => {
        console.error("Error listening to typing indicators:", error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up typing listener:", error);
    return () => {};
  }
};

/**
 * Clean up old typing indicators (server-side or periodic client cleanup)
 */
export const cleanupOldTypingIndicators = async (
  conversationId: string
): Promise<void> => {
  try {
    const q = query(
      collection(db, "typingIndicators"),
      where("conversationId", "==", conversationId)
    );

    const snapshot = await getDocs(q);
    const now = Date.now();

    for (const doc of snapshot.docs) {
      const data = doc.data() as TypingIndicator;
      if (now - data.timestamp > 5000) {
        await deleteDoc(doc.ref);
      }
    }
  } catch (error) {
    console.error("Error cleaning up typing indicators:", error);
  }
};
