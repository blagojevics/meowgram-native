import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "./AuthContext";
import {
  subscribeToUserConversations,
  subscribeToConversationMessages,
  subscribeToConversation,
  sendMessage as sendMessageService,
  markMessageAsRead,
  markConversationAsRead,
  deleteMessage as deleteMessageService,
  editMessage as editMessageService,
  getOrCreateConversation,
} from "../services/conversationService";
import {
  updateUserPresence,
  listenToUsersPresence,
  setTypingIndicator,
  listenToTypingIndicators,
} from "../services/presenceService";
import { getUserProfile } from "../services/userService";
import { db } from "../config/firebase";
import {
  Conversation,
  Message,
  TypingIndicator,
  UserPresence,
} from "../@types/chat";

interface ChatContextType {
  // Conversation state
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  conversationsLoading: boolean;
  conversationsError: Error | null;

  // Message state
  messages: Message[];
  messagesLoading: boolean;
  messagesError: Error | null;

  // Typing indicators
  typingUsers: TypingIndicator[];

  // Presence state
  userPresences: { [userId: string]: UserPresence | null };

  // Unread count
  totalUnreadCount: number;

  // Actions
  selectConversation: (conversation: Conversation | null) => Promise<void>;
  sendMessage: (
    text: string,
    mediaUrls?: string[],
    mediaTypes?: string[],
    replyTo?: Message["replyTo"]
  ) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  markConversationRead: () => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  setTyping: (isTyping: boolean) => Promise<void>;
  startConversation: (otherUserId: string) => Promise<Conversation>;
  refreshConversations: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversationState] =
    useState<Conversation | null>(null);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<Error | null>(
    null
  );
  const [forceRefresh, setForceRefresh] = useState(0);

  // Message state
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<Error | null>(null);

  // Typing indicators
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  // Presence state
  const [userPresences, setUserPresences] = useState<{
    [userId: string]: UserPresence | null;
  }>({});

  // Cache user profile to avoid repeated fetches
  const userProfileRef = React.useRef<any>(null);

  // Refs for cleanup
  const conversationUnsubscribeRef = React.useRef<(() => void) | null>(null);
  const messagesUnsubscribeRef = React.useRef<(() => void) | null>(null);
  const presenceUnsubscribeRef = React.useRef<(() => void) | null>(null);
  const typingUnsubscribeRef = React.useRef<(() => void) | null>(null);
  const appStateSubscriptionRef = React.useRef<any>(null);

  // Calculate total unread count
  const totalUnreadCount = conversations.reduce(
    (sum, conv) => sum + (conv.unreadCount || 0),
    0
  );

  /**
   * Clean up all subscriptions
   */
  const cleanupSubscriptions = useCallback(() => {
    if (conversationUnsubscribeRef.current) {
      conversationUnsubscribeRef.current();
      conversationUnsubscribeRef.current = null;
    }
    if (messagesUnsubscribeRef.current) {
      messagesUnsubscribeRef.current();
      messagesUnsubscribeRef.current = null;
    }
    if (presenceUnsubscribeRef.current) {
      presenceUnsubscribeRef.current();
      presenceUnsubscribeRef.current = null;
    }
    if (typingUnsubscribeRef.current) {
      typingUnsubscribeRef.current();
      typingUnsubscribeRef.current = null;
    }
  }, []);

  /**
   * Setup app state listener for presence - DISABLED to reduce Firestore quota usage
   * Only keeping typing indicators and read status
   */
  useEffect(() => {
    // Presence updates disabled - using only typing indicators and read status
    return () => {};
  }, [user, selectedConversation?.id]);

  /**
   * Load user's conversations
   */
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setConversationsLoading(false);
      return;
    }

    setConversationsLoading(true);
    setConversationsError(null);

    let hasReceivedData = false;
    let isSubscribed = true;

    // Manual fetch as fallback if subscription doesn't fire
    const manualFetch = async () => {
      try {
        const { getDocs, collection, query, where } = await import(
          "firebase/firestore"
        );
        const q = query(
          collection(db, "conversations"),
          where("participants", "array-contains", user.uid)
        );
        const snapshot = await getDocs(q);

        if (!isSubscribed) return;

        const conversations = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Conversation))
          .filter((conv) => !conv.isArchived)
          .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);

        hasReceivedData = true;
        setConversations(conversations);
        setConversationsLoading(false);
      } catch (error) {
        console.error("[CHAT] Manual fetch error:", error);
        if (isSubscribed) {
          setConversationsError(error as Error);
          setConversationsLoading(false);
        }
      }
    };

    const unsubscribe = subscribeToUserConversations(
      user.uid,
      (conversations) => {
        hasReceivedData = true;
        setConversations(conversations);
        setConversationsLoading(false);
      },
      (error) => {
        hasReceivedData = true;
        console.error("[CHAT] Error loading conversations:", error);
        setConversationsError(error);
        setConversationsLoading(false);
      }
    );

    conversationUnsubscribeRef.current = unsubscribe;

    // If subscription doesn't fire within 5 seconds, try manual fetch
    const manualFetchTimeout = setTimeout(() => {
      if (!hasReceivedData && isSubscribed) {
        console.log(
          "[CHAT] Subscription silent after 5 seconds, trying manual fetch"
        );
        manualFetch();
      }
    }, 5000);

    // Set initial loading to false after 15 seconds if no data received
    const initialLoadTimeout = setTimeout(() => {
      if (!hasReceivedData) {
        console.log(
          "[CHAT] No data received after 15 seconds, assuming no conversations"
        );
        setConversations([]);
        setConversationsLoading(false);
      }
    }, 15000);

    return () => {
      isSubscribed = false;
      clearTimeout(manualFetchTimeout);
      clearTimeout(initialLoadTimeout);
      if (unsubscribe) unsubscribe();
    };
  }, [user, forceRefresh]);

  /**
   * Load messages and set up subscriptions when conversation is selected
   */
  useEffect(() => {
    if (!selectedConversation || !user) {
      setMessages([]);
      setTypingUsers([]);
      // Cleanup existing subscriptions
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current();
        messagesUnsubscribeRef.current = null;
      }
      if (typingUnsubscribeRef.current) {
        typingUnsubscribeRef.current();
        typingUnsubscribeRef.current = null;
      }
      return;
    }

    const conversationId = selectedConversation.id;
    const userId = user.uid;

    // Cleanup any existing subscription first to prevent duplicates
    if (messagesUnsubscribeRef.current) {
      messagesUnsubscribeRef.current();
      messagesUnsubscribeRef.current = null;
    }

    setMessagesLoading(true);
    setMessagesError(null);

    // Subscribe to messages
    const messagesUnsub = subscribeToConversationMessages(
      conversationId,
      (messages) => {
        setMessages(messages);
        setMessagesLoading(false);
      },
      (error) => {
        console.error("[CHAT-MSG] Error loading messages:", error);
        setMessagesError(error);
        setMessagesLoading(false);
      }
    );
    messagesUnsubscribeRef.current = messagesUnsub;

    // Typing indicators disabled to reduce Firestore quota usage
    // Each keystroke was creating a write + subscription update
    // typingUnsubscribeRef.current = null;

    // Presence subscriptions disabled to reduce Firestore quota usage
    // Only keeping typing indicators and read status

    // Mark conversation as read when opened
    markConversationAsRead(conversationId, userId).catch(() => {
      // Silently ignore errors
    });

    return () => {
      // Cleanup on unmount or conversation change
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current();
        messagesUnsubscribeRef.current = null;
      }
      if (typingUnsubscribeRef.current) {
        typingUnsubscribeRef.current();
        typingUnsubscribeRef.current = null;
      }
    };
  }, [selectedConversation?.id, user?.uid]);

  /**
   * Select a conversation
   */
  const selectConversation = useCallback(
    async (conversation: Conversation | null) => {
      setSelectedConversationState(conversation);
    },
    []
  );

  /**
   * Send a message
   */
  const sendMessage = useCallback(
    async (
      text: string,
      mediaUrls?: string[],
      mediaTypes?: string[],
      replyTo?: Message["replyTo"]
    ) => {
      if (!user || !selectedConversation) {
        throw new Error("User or conversation not available");
      }

      try {
        // Use cached profile or fetch once
        if (!userProfileRef.current) {
          userProfileRef.current = await getUserProfile(user.uid);
        }

        const userProfile = userProfileRef.current;
        if (!userProfile) {
          throw new Error("User profile not found");
        }

        await sendMessageService(
          selectedConversation.id,
          user.uid,
          userProfile.displayName,
          userProfile.avatarUrl,
          text,
          mediaUrls,
          mediaTypes,
          replyTo
        );
      } catch (error) {
        console.error("Error sending message:", error);
        throw error;
      }
    },
    [user, selectedConversation]
  );

  /**
   * Mark message as read
   */
  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!selectedConversation || !user) return;

      try {
        await markMessageAsRead(selectedConversation.id, messageId, user.uid);
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    },
    [selectedConversation, user]
  );

  /**
   * Mark conversation as read
   */
  const markConversationRead = useCallback(async () => {
    if (!selectedConversation || !user) return;

    try {
      await markConversationAsRead(selectedConversation.id, user.uid);
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  }, [selectedConversation, user]);

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!selectedConversation || !user) {
        throw new Error("User or conversation not available");
      }

      try {
        await deleteMessageService(selectedConversation.id, messageId);
      } catch (error) {
        console.error("Error deleting message:", error);
        throw error;
      }
    },
    [selectedConversation, user]
  );

  /**
   * Edit a message
   */
  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      if (!selectedConversation || !user) {
        throw new Error("User or conversation not available");
      }

      try {
        await editMessageService(selectedConversation.id, messageId, newText);
      } catch (error) {
        console.error("Error editing message:", error);
        throw error;
      }
    },
    [selectedConversation, user]
  );

  /**
   * Set typing indicator - DISABLED to reduce Firestore quota usage
   * Was creating a write on every keystroke
   */
  const setTyping = useCallback(async (isTyping: boolean) => {
    // Typing indicators disabled to prevent quota exhaustion
    // Each keystroke was creating a Firestore write
    return;
  }, []);

  /**
   * Start a conversation with another user
   */
  const startConversation = useCallback(
    async (otherUserId: string) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      try {
        const currentUserProfile = await getUserProfile(user.uid);
        const otherUserProfile = await getUserProfile(otherUserId);

        if (!currentUserProfile || !otherUserProfile) {
          throw new Error("User profile not found");
        }

        const conversation = await getOrCreateConversation(
          user.uid,
          otherUserId,
          currentUserProfile,
          otherUserProfile
        );

        return conversation;
      } catch (error) {
        console.error("Error starting conversation:", error);
        throw error;
      }
    },
    [user]
  );

  const refreshConversations = useCallback(() => {
    console.log("[CHAT] Manual refresh triggered");
    setForceRefresh((prev) => prev + 1);
  }, []);

  const value: ChatContextType = {
    conversations,
    selectedConversation,
    conversationsLoading,
    conversationsError,
    messages,
    messagesLoading,
    messagesError,
    typingUsers,
    userPresences,
    totalUnreadCount,
    selectConversation,
    sendMessage,
    markAsRead,
    markConversationRead,
    deleteMessage,
    editMessage,
    setTyping,
    startConversation,
    refreshConversations,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
};
