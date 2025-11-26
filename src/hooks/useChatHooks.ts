import { useState, useEffect } from "react";
import {
  subscribeToUserConversations,
  subscribeToConversationMessages,
  subscribeToConversation,
} from "../services/conversationService";
import {
  listenToUserPresence,
  listenToUsersPresence,
  listenToTypingIndicators,
} from "../services/presenceService";
import {
  Conversation,
  Message,
  UserPresence,
  TypingIndicator,
} from "../@types/chat";

/**
 * Hook to subscribe to user's conversations in real-time
 */
export const useUserConversations = (
  userId: string
): {
  conversations: Conversation[];
  loading: boolean;
  error: Error | null;
} => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToUserConversations(
      userId,
      (conversations) => {
        setConversations(conversations);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return { conversations, loading, error };
};

/**
 * Hook to subscribe to messages in a conversation
 */
export const useConversationMessages = (
  conversationId: string
): {
  messages: Message[];
  loading: boolean;
  error: Error | null;
} => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToConversationMessages(
      conversationId,
      (messages) => {
        setMessages(messages);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [conversationId]);

  return { messages, loading, error };
};

/**
 * Hook to subscribe to a specific conversation
 */
export const useConversation = (
  conversationId: string
): {
  conversation: Conversation | null;
  loading: boolean;
  error: Error | null;
} => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToConversation(
      conversationId,
      (conversation) => {
        setConversation(conversation);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [conversationId]);

  return { conversation, loading, error };
};

/**
 * Hook to listen to user presence
 */
export const useUserPresence = (
  userId: string
): {
  presence: UserPresence | null;
  loading: boolean;
} => {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPresence(null);
      setLoading(false);
      return;
    }

    const unsubscribe = listenToUserPresence(userId, (presence) => {
      setPresence(presence);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return { presence, loading };
};

/**
 * Hook to listen to multiple users' presence
 */
export const useUsersPresence = (
  userIds: string[]
): {
  presences: { [userId: string]: UserPresence | null };
  loading: boolean;
} => {
  const [presences, setPresences] = useState<{
    [userId: string]: UserPresence | null;
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setPresences({});
      setLoading(false);
      return;
    }

    const unsubscribe = listenToUsersPresence(userIds, (presences) => {
      setPresences(presences);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [userIds?.join(",")]); // Re-run if userIds changes

  return { presences, loading };
};

/**
 * Hook to listen to typing indicators in a conversation
 */
export const useTypingIndicators = (
  conversationId: string
): {
  typingUsers: TypingIndicator[];
  loading: boolean;
} => {
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setTypingUsers([]);
      setLoading(false);
      return;
    }

    const unsubscribe = listenToTypingIndicators(conversationId, (users) => {
      setTypingUsers(users);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId]);

  return { typingUsers, loading };
};
