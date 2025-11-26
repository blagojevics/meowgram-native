import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { ConversationUser } from "../@types/chat";

/**
 * Create or update user conversation metadata
 */
export const setUserConversationMetadata = async (
  userId: string,
  conversationId: string,
  isMuted: boolean = false
): Promise<ConversationUser> => {
  try {
    const metadataId = `${userId}_${conversationId}`;
    const now = Date.now();

    const metadata: ConversationUser = {
      conversationId,
      userId,
      joinedAt: now,
      isMuted,
      lastReadTimestamp: now,
    };

    await setDoc(doc(db, "conversationUsers", metadataId), metadata, {
      merge: true,
    });

    return metadata;
  } catch (error) {
    console.error("Error setting user conversation metadata:", error);
    throw error;
  }
};

/**
 * Get user conversation metadata
 */
export const getUserConversationMetadata = async (
  userId: string,
  conversationId: string
): Promise<ConversationUser | null> => {
  try {
    const metadataId = `${userId}_${conversationId}`;
    const metadataDoc = await getDoc(doc(db, "conversationUsers", metadataId));

    if (metadataDoc.exists()) {
      return metadataDoc.data() as ConversationUser;
    }
    return null;
  } catch (error) {
    console.error("Error getting user conversation metadata:", error);
    throw error;
  }
};

/**
 * Get all conversation metadata for a user
 */
export const getUserAllConversationMetadata = async (
  userId: string
): Promise<ConversationUser[]> => {
  try {
    const q = query(
      collection(db, "conversationUsers"),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as ConversationUser);
  } catch (error) {
    console.error("Error getting user all conversation metadata:", error);
    throw error;
  }
};

/**
 * Update last read message for user in conversation
 */
export const updateUserLastReadMessage = async (
  userId: string,
  conversationId: string,
  messageId: string
): Promise<void> => {
  try {
    const metadataId = `${userId}_${conversationId}`;
    await updateDoc(doc(db, "conversationUsers", metadataId), {
      lastReadMessageId: messageId,
      lastReadTimestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error updating user last read message:", error);
    throw error;
  }
};

/**
 * Mute notifications for a conversation
 */
export const muteConversation = async (
  userId: string,
  conversationId: string
): Promise<void> => {
  try {
    const metadataId = `${userId}_${conversationId}`;
    await updateDoc(doc(db, "conversationUsers", metadataId), {
      isMuted: true,
    });
  } catch (error) {
    console.error("Error muting conversation:", error);
    throw error;
  }
};

/**
 * Unmute notifications for a conversation
 */
export const unmuteConversation = async (
  userId: string,
  conversationId: string
): Promise<void> => {
  try {
    const metadataId = `${userId}_${conversationId}`;
    await updateDoc(doc(db, "conversationUsers", metadataId), {
      isMuted: false,
    });
  } catch (error) {
    console.error("Error unmuting conversation:", error);
    throw error;
  }
};

/**
 * Initialize conversation for both users (called when creating a conversation)
 */
export const initializeConversationForUsers = async (
  userIds: string[],
  conversationId: string
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const now = Date.now();

    userIds.forEach((userId) => {
      const metadataId = `${userId}_${conversationId}`;
      batch.set(doc(db, "conversationUsers", metadataId), {
        conversationId,
        userId,
        joinedAt: now,
        isMuted: false,
        lastReadTimestamp: now,
      });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error initializing conversation for users:", error);
    throw error;
  }
};
