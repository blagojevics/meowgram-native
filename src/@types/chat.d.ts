// Chat-related TypeScript types for MeowChat

/**
 * User type representing a MeowGram user in chat context
 */
export interface User {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  bio: string;
  isOnline: boolean;
  lastSeen: number; // timestamp
}

/**
 * Conversation type representing a chat between two users
 */
export interface Conversation {
  id: string;
  participants: string[]; // array of user IDs
  participantDetails: {
    [userId: string]: {
      uid: string;
      username: string;
      displayName: string;
      avatarUrl: string;
    };
  };
  lastMessage: Message | null;
  lastMessageTimestamp: number;
  createdAt: number;
  updatedAt: number;
  unreadCount: number; // for current user
  isArchived: boolean;
}

/**
 * Message type representing individual messages within a conversation
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  mediaUrls?: string[];
  mediaTypes?: string[]; // e.g., 'image', 'video', 'file'
  timestamp: number;
  isRead: boolean;
  readBy: {
    [userId: string]: number; // userId: timestamp when read
  };
  editedAt?: number;
  deletedAt?: number;
  replyTo?: {
    messageId: string;
    senderName: string;
    text: string;
  };
}

/**
 * ConversationUser type tracking user metadata within a conversation
 */
export interface ConversationUser {
  conversationId: string;
  userId: string;
  joinedAt: number;
  isMuted: boolean;
  lastReadMessageId?: string;
  lastReadTimestamp: number;
}

/**
 * TypingIndicator type showing when someone is typing
 */
export interface TypingIndicator {
  userId: string;
  username: string;
  timestamp: number;
  conversationId: string;
}

/**
 * UserPresence type tracking online status
 */
export interface UserPresence {
  uid: string;
  isOnline: boolean;
  lastSeen: number;
  status: "available" | "away" | "busy" | "offline";
  currentConversationId?: string; // which conversation they're actively viewing
}

/**
 * Notification type for chat-related events
 */
export interface ChatNotification {
  id: string;
  userId: string;
  conversationId: string;
  type: "new_message" | "typing" | "user_online";
  data: {
    senderName?: string;
    messagePreview?: string;
    timestamp: number;
  };
  isRead: boolean;
}
