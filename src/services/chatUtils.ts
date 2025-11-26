import { Message, Conversation } from "../@types/chat";

/**
 * Format timestamp to readable time string
 */
export const formatMessageTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();

  // Same day - show time only
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  // This week (within 7 days)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (date >= sevenDaysAgo) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  // Older dates
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

/**
 * Format timestamp to full date and time
 */
export const formatFullTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Get time diff from now in human readable format
 */
export const getTimeDiffFromNow = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return formatMessageTime(timestamp);
};

/**
 * Check if message is edited
 */
export const isMessageEdited = (message: Message): boolean => {
  return !!message.editedAt;
};

/**
 * Check if message is deleted
 */
export const isMessageDeleted = (message: Message): boolean => {
  return !!message.deletedAt;
};

/**
 * Check if message has media
 */
export const messageHasMedia = (message: Message): boolean => {
  return !!(message.mediaUrls && message.mediaUrls.length > 0);
};

/**
 * Get message preview text (for conversation list)
 */
export const getMessagePreview = (message: Message | null): string => {
  if (!message) return "No messages yet";

  if (isMessageDeleted(message)) {
    return "[Message deleted]";
  }

  if (messageHasMedia(message)) {
    const mediaCount = message.mediaUrls?.length || 0;
    return `📎 ${mediaCount} attachment${mediaCount > 1 ? "s" : ""}`;
  }

  // Truncate long messages
  return message.text.length > 50
    ? message.text.substring(0, 50) + "..."
    : message.text;
};

/**
 * Sort messages by timestamp (ascending)
 */
export const sortMessagesByTime = (messages: Message[]): Message[] => {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Group messages by sender for UI optimization
 */
export const groupMessagesBySender = (
  messages: Message[]
): Array<{ senderId: string; messages: Message[] }> => {
  const grouped: { [key: string]: Message[] } = {};

  messages.forEach((msg) => {
    if (!grouped[msg.senderId]) {
      grouped[msg.senderId] = [];
    }
    grouped[msg.senderId].push(msg);
  });

  return Object.entries(grouped).map(([senderId, msgs]) => ({
    senderId,
    messages: msgs,
  }));
};

/**
 * Check if current user has read message
 */
export const userHasReadMessage = (
  message: Message,
  userId: string
): boolean => {
  return !!(message.readBy && message.readBy[userId]);
};

/**
 * Get unread message count for a conversation
 */
export const getUnreadMessageCount = (
  messages: Message[],
  userId: string
): number => {
  return messages.filter((msg) => !userHasReadMessage(msg, userId)).length;
};

/**
 * Filter out deleted messages
 */
export const filterDeletedMessages = (messages: Message[]): Message[] => {
  return messages.filter((msg) => !isMessageDeleted(msg));
};

/**
 * Get other participant in a two-person conversation
 */
export const getOtherParticipant = (
  conversation: Conversation,
  currentUserId: string
): string | null => {
  return conversation.participants.find((id) => id !== currentUserId) || null;
};

/**
 * Check if conversation has unread messages
 */
export const hasUnreadMessages = (conversation: Conversation): boolean => {
  return conversation.unreadCount > 0;
};

/**
 * Sort conversations by most recent
 */
export const sortConversationsByRecent = (
  conversations: Conversation[]
): Conversation[] => {
  return [...conversations].sort(
    (a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp
  );
};

/**
 * Validate message text
 */
export const isValidMessageText = (text: string): boolean => {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= 5000;
};

/**
 * Sanitize message text (basic)
 */
export const sanitizeMessageText = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .substring(0, 5000); // Limit length
};

/**
 * Check if message contains URLs
 */
export const messageContainsUrls = (message: Message): boolean => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return urlRegex.test(message.text);
};

/**
 * Extract URLs from message text
 */
export const extractUrlsFromMessage = (message: Message): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = message.text.match(urlRegex);
  return matches || [];
};

/**
 * Create conversation ID from two user IDs (consistent)
 */
export const createConversationId = (
  userId1: string,
  userId2: string
): string => {
  return [userId1, userId2].sort().join("_");
};

/**
 * Check if user is blocked in conversation (future feature)
 */
export const isUserBlocked = (
  conversation: Conversation,
  userId: string
): boolean => {
  // This is a placeholder for future blocking functionality
  return false;
};
