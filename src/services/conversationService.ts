import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  QueryConstraint,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Conversation, Message, ConversationUser } from "../@types/chat";

/**
 * Create a new conversation between two users
 */
export const createConversation = async (
  currentUserId: string,
  otherUserId: string,
  currentUserData: any,
  otherUserData: any
): Promise<Conversation> => {
  const conversationId = [currentUserId, otherUserId].sort().join("_");
  const now = Date.now();

  const conversationData: Conversation = {
    id: conversationId,
    participants: [currentUserId, otherUserId],
    participantDetails: {
      [currentUserId]: {
        uid: currentUserData.uid,
        username: currentUserData.username,
        displayName: currentUserData.displayName || currentUserData.username,
        avatarUrl:
          currentUserData.avatarUrl || currentUserData.profilePic || "",
      },
      [otherUserId]: {
        uid: otherUserData.uid,
        username: otherUserData.username,
        displayName: otherUserData.displayName || otherUserData.username,
        avatarUrl: otherUserData.avatarUrl || otherUserData.profilePic || "",
      },
    },
    lastMessage: null,
    lastMessageTimestamp: now,
    createdAt: now,
    updatedAt: now,
    unreadCount: 0,
    isArchived: false,
  };

  try {
    console.log("[ConversationService] Creating conversation with data:", {
      id: conversationData.id,
      participants: conversationData.participants,
      participantUsernames: [
        conversationData.participantDetails[currentUserId].username,
        conversationData.participantDetails[otherUserId].username,
      ],
    });

    await setDoc(doc(db, "conversations", conversationId), conversationData);
    console.log("[ConversationService] Successfully created conversation");
    return conversationData;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};

/**
 * Get or create a conversation
 */
export const getOrCreateConversation = async (
  currentUserId: string,
  otherUserId: string,
  currentUserData: any,
  otherUserData: any
): Promise<Conversation> => {
  const conversationId = [currentUserId, otherUserId].sort().join("_");

  try {
    const conversationDoc = await getDoc(
      doc(db, "conversations", conversationId)
    );

    if (conversationDoc.exists()) {
      const existingConv = conversationDoc.data() as Conversation;

      // Only update if participantDetails is completely missing
      // Don't update if it exists but might be outdated to save writes
      if (!existingConv.participantDetails) {
        console.log(
          "[ConversationService] CRITICAL: Updating conversation with missing participantDetails"
        );

        // Update the conversation with proper participantDetails
        await setDoc(
          doc(db, "conversations", conversationId),
          {
            participantDetails: {
              [currentUserId]: {
                uid: currentUserData.uid,
                username: currentUserData.username,
                displayName:
                  currentUserData.displayName || currentUserData.username,
                avatarUrl:
                  currentUserData.avatarUrl || currentUserData.profilePic || "",
              },
              [otherUserId]: {
                uid: otherUserData.uid,
                username: otherUserData.username,
                displayName:
                  otherUserData.displayName || otherUserData.username,
                avatarUrl:
                  otherUserData.avatarUrl || otherUserData.profilePic || "",
              },
            },
          },
          { merge: true }
        );

        // Return updated conversation
        const updatedDoc = await getDoc(
          doc(db, "conversations", conversationId)
        );
        return updatedDoc.data() as Conversation;
      }

      return existingConv;
    }

    console.log(
      "[ConversationService] No existing conversation, creating new one"
    );
    return await createConversation(
      currentUserId,
      otherUserId,
      currentUserData,
      otherUserData
    );
  } catch (error) {
    console.error(
      "[ConversationService] Error in getOrCreateConversation:",
      error
    );
    if (error instanceof Error) {
      console.error("[ConversationService] Error message:", error.message);
      console.error("[ConversationService] Error stack:", error.stack);
    }
    throw error;
  }
};

/**
 * Get a conversation by ID
 */
export const getConversation = async (
  conversationId: string
): Promise<Conversation | null> => {
  try {
    const conversationDoc = await getDoc(
      doc(db, "conversations", conversationId)
    );
    if (conversationDoc.exists()) {
      return conversationDoc.data() as Conversation;
    }
    return null;
  } catch (error) {
    console.error("Error getting conversation:", error);
    throw error;
  }
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (
  userId: string,
  pageSize: number = 20
): Promise<Conversation[]> => {
  try {
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", userId),
      limit(pageSize)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => doc.data() as Conversation)
      .filter((conv) => !conv.isArchived)
      .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp); // Sort client-side
  } catch (error) {
    console.error("Error getting user conversations:", error);
    throw error;
  }
};

/**
 * Get paginated conversations for a user
 */
export const getUserConversationsPaginated = async (
  userId: string,
  pageSize: number = 20,
  lastConversation?: Conversation
): Promise<Conversation[]> => {
  try {
    const constraints: QueryConstraint[] = [
      where("participants", "array-contains", userId),
      limit(pageSize + 1),
    ];

    const q = query(collection(db, "conversations"), ...constraints);
    const snapshot = await getDocs(q);

    let conversations = snapshot.docs
      .map((doc) => doc.data() as Conversation)
      .filter((conv) => !conv.isArchived)
      .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp); // Sort client-side

    // Filter by last conversation if pagination
    if (lastConversation) {
      conversations = conversations.filter(
        (c) => c.lastMessageTimestamp < lastConversation.lastMessageTimestamp
      );
    }

    return conversations.slice(0, pageSize);
  } catch (error) {
    console.error("Error getting paginated conversations:", error);
    throw error;
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string,
  text: string,
  mediaUrls?: string[],
  mediaTypes?: string[],
  replyTo?: Message["replyTo"]
): Promise<Message> => {
  try {
    const messageId = doc(
      collection(db, "conversations", conversationId, "messages")
    ).id;
    const now = Date.now();

    const messageData: any = {
      id: messageId,
      conversationId,
      senderId,
      senderName,
      senderAvatar: senderAvatar || "",
      text,
      timestamp: now,
      isRead: false,
      readBy: {
        [senderId]: now,
      },
    };

    // Add optional fields only if they exist
    if (mediaUrls && mediaUrls.length > 0) {
      messageData.mediaUrls = mediaUrls;
    }
    if (mediaTypes && mediaTypes.length > 0) {
      messageData.mediaTypes = mediaTypes;
    }
    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    const messagesRef = collection(
      db,
      "conversations",
      conversationId,
      "messages"
    );

    console.log("[ConversationService] Sending message with data:", {
      id: messageData.id,
      hasMediaUrls: !!messageData.mediaUrls,
      hasMediaTypes: !!messageData.mediaTypes,
      hasReplyTo: !!messageData.replyTo,
    });

    // Write message and update conversation in parallel
    const conversationRef = doc(db, "conversations", conversationId);

    // Use setDoc with merge to preserve participantDetails
    await Promise.all([
      setDoc(doc(messagesRef, messageId), messageData),
      setDoc(
        conversationRef,
        {
          lastMessage: {
            id: messageId,
            text: text.substring(0, 50),
            senderId,
            senderName,
          },
          lastMessageTimestamp: now,
          updatedAt: now,
        },
        { merge: true }
      ),
    ]);

    return messageData;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (
  conversationId: string,
  pageSize: number = 30
): Promise<Message[]> => {
  try {
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("timestamp", "desc"),
      limit(pageSize)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Message).reverse(); // Reverse to show oldest first
  } catch (error) {
    console.error("Error getting messages:", error);
    throw error;
  }
};

/**
 * Get paginated messages for a conversation
 */
export const getMessagesPaginated = async (
  conversationId: string,
  pageSize: number = 30,
  lastMessage?: Message
): Promise<Message[]> => {
  try {
    const constraints: QueryConstraint[] = [
      orderBy("timestamp", "desc"),
      limit(pageSize + 1),
    ];

    if (lastMessage) {
      constraints.push(startAfter(lastMessage.timestamp));
    }

    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      ...constraints
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Message).reverse();
  } catch (error) {
    console.error("Error getting paginated messages:", error);
    throw error;
  }
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (
  conversationId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  try {
    const messageRef = doc(
      db,
      "conversations",
      conversationId,
      "messages",
      messageId
    );
    await updateDoc(messageRef, {
      isRead: true,
      [`readBy.${userId}`]: Date.now(),
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
    throw error;
  }
};

/**
 * Mark all messages in conversation as read
 */
export const markConversationAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    const messagesRef = collection(
      db,
      "conversations",
      conversationId,
      "messages"
    );
    const q = query(messagesRef, where("readBy", "!=", null));

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        [`readBy.${userId}`]: Date.now(),
      });
    });

    await batch.commit();

    // Update conversation unread count
    await updateDoc(doc(db, "conversations", conversationId), {
      unreadCount: 0,
    });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    throw error;
  }
};

/**
 * Edit a message
 */
export const editMessage = async (
  conversationId: string,
  messageId: string,
  newText: string
): Promise<void> => {
  try {
    const messageRef = doc(
      db,
      "conversations",
      conversationId,
      "messages",
      messageId
    );
    await updateDoc(messageRef, {
      text: newText,
      editedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error editing message:", error);
    throw error;
  }
};

/**
 * Delete a message (soft delete - sets deletedAt timestamp)
 */
export const deleteMessage = async (
  conversationId: string,
  messageId: string
): Promise<void> => {
  try {
    const messageRef = doc(
      db,
      "conversations",
      conversationId,
      "messages",
      messageId
    );
    await updateDoc(messageRef, {
      deletedAt: Date.now(),
      text: "[Message deleted]",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

/**
 * Archive a conversation
 */
export const archiveConversation = async (
  conversationId: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, "conversations", conversationId), {
      isArchived: true,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error archiving conversation:", error);
    throw error;
  }
};

/**
 * Unarchive a conversation
 */
export const unarchiveConversation = async (
  conversationId: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, "conversations", conversationId), {
      isArchived: false,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error unarchiving conversation:", error);
    throw error;
  }
};

/**
 * Clear all messages in a conversation
 */
export const clearConversationMessages = async (
  conversationId: string
): Promise<void> => {
  try {
    console.log("[ConversationService] Clearing messages for:", conversationId);

    // Get all messages in the conversation
    const messagesRef = collection(
      db,
      "conversations",
      conversationId,
      "messages"
    );
    const messagesSnapshot = await getDocs(messagesRef);

    // Delete all messages in batches
    const batch = writeBatch(db);
    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Update conversation metadata
    batch.update(doc(db, "conversations", conversationId), {
      lastMessage: null,
      lastMessageTimestamp: Date.now(),
      updatedAt: Date.now(),
    });

    await batch.commit();
    console.log("[ConversationService] Successfully cleared messages");
  } catch (error) {
    console.error("Error clearing conversation messages:", error);
    throw error;
  }
};

/**
 * Delete a conversation for the current user (hide it from their view)
 * The conversation remains visible for the other participant
 */
export const deleteConversation = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    console.log(
      "[ConversationService] Hiding conversation for user:",
      conversationId,
      userId
    );

    // Add user to deletedBy array to hide it from their view
    await updateDoc(doc(db, "conversations", conversationId), {
      deletedBy: arrayUnion(userId),
      updatedAt: Date.now(),
    });

    console.log(
      "[ConversationService] Successfully hid conversation from user"
    );
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
};

/**
 * Update conversation unread count
 */
export const updateConversationUnreadCount = async (
  conversationId: string,
  increment: number
): Promise<void> => {
  try {
    const conversationRef = doc(db, "conversations", conversationId);
    const conversation = await getDoc(conversationRef);

    if (conversation.exists()) {
      const currentCount = conversation.data().unreadCount || 0;
      const newCount = Math.max(0, currentCount + increment);
      await updateDoc(conversationRef, {
        unreadCount: newCount,
      });
    }
  } catch (error) {
    console.error("Error updating conversation unread count:", error);
    throw error;
  }
};

/**
 * Subscribe to real-time conversation updates for a user
 */
export const subscribeToUserConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  try {
    // Setting up conversations subscription
    // Query without orderBy to avoid composite index requirement
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const conversations = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return { id: doc.id, ...data } as Conversation;
          })
          .filter((conv) => {
            // Filter out archived conversations
            if (conv.isArchived) return false;

            // Filter out conversations deleted by current user
            if (conv.deletedBy && conv.deletedBy.includes(userId)) return false;

            return true;
          })
          .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);

        callback(conversations);
      },
      (error) => {
        console.error("[CONV] Error listening to conversations:", error);
        if (onError) onError(error as Error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("[CONV] Exception in setup:", error);
    return () => {};
  }
};

/**
 * Subscribe to real-time message updates in a conversation
 */
export const subscribeToConversationMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void,
  onError?: (error: Error) => void,
  pageSize: number = 50
): (() => void) => {
  try {
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("timestamp", "asc"),
      limit(pageSize)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs.map((doc) => doc.data() as Message);
        callback(messages);
      },
      (error) => {
        console.error("[CONV-MSG] Error listening to messages:", error);
        if (onError) onError(error as Error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up message listener:", error);
    return () => {};
  }
};

/**
 * Subscribe to changes in a specific conversation
 */
export const subscribeToConversation = (
  conversationId: string,
  callback: (conversation: Conversation | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  try {
    const unsubscribe = onSnapshot(
      doc(db, "conversations", conversationId),
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as Conversation);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error("Error listening to conversation:", error);
        if (onError) onError(error as Error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up conversation listener:", error);
    return () => {};
  }
};
