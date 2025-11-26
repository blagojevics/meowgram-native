/**
 * MeowChat Backend API Service
 * Bridge service for Firebase-authenticated users only (no MongoDB user management)
 */

import apiClient from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

// Type definitions for MeowChat backend models
// Note: Users are managed in Firebase, not MongoDB
export interface MeowChatUser {
  _id: string; // MongoDB ID (auto-created by backend)
  firebaseUid: string; // Firebase UID (primary identifier)
  username: string;
  email: string;
  profilePicture?: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface MeowChatMessage {
  _id: string;
  content: string;
  sender: string | MeowChatUser;
  chat: string;
  type: "text" | "image" | "file";
  fileUrl?: string;
  fileName?: string;
  createdAt: Date;
  readBy: string[];
  reactions: Array<{ user: string; emoji: string }>;
  replyTo?: string;
}

export interface MeowChat {
  _id: string;
  name?: string;
  type: "direct" | "group";
  participants: string[] | MeowChatUser[];
  lastMessage?: MeowChatMessage;
  lastActivity: Date;
  createdBy: string;
  createdAt: Date;
}

/**
 * Authentication API
 * All authentication happens through Firebase
 */
export const meowChatAuthAPI = {
  /**
   * Authenticate with Firebase token (auto-creates user in backend if needed)
   * This is the only auth method needed - Firebase handles all user management
   */
  authenticateWithFirebase: async (): Promise<{ user: MeowChatUser }> => {
    const firebaseToken = await apiClient.getFirebaseToken();
    if (!firebaseToken) {
      throw new Error("No Firebase token available");
    }
    return await apiClient.post(API_ENDPOINTS.AUTH.FIREBASE_LOGIN, {
      firebaseToken,
    });
  },

  /**
   * Get current authenticated user info from backend
   */
  getMe: async (): Promise<MeowChatUser> => {
    return await apiClient.get(API_ENDPOINTS.AUTH.ME);
  },

  /**
   * Search Firebase users (backend will search by Firebase data)
   */
  searchUsers: async (query: string): Promise<MeowChatUser[]> => {
    return await apiClient.get(API_ENDPOINTS.AUTH.SEARCH_USERS, { q: query });
  },
};

/**
 * Chat API
 */
export const meowChatAPI = {
  /**
   * Get all chats for current user
   */
  getChats: async (): Promise<MeowChat[]> => {
    return await apiClient.get(API_ENDPOINTS.CHATS.LIST);
  },

  /**
   * Create a new chat
   */
  createChat: async (chatData: {
    type: "direct" | "group";
    participants: string[];
    name?: string;
  }): Promise<MeowChat> => {
    return await apiClient.post(API_ENDPOINTS.CHATS.CREATE, chatData);
  },

  /**
   * Get chat by ID
   */
  getChat: async (chatId: string): Promise<MeowChat> => {
    return await apiClient.get(API_ENDPOINTS.CHATS.GET(chatId));
  },

  /**
   * Update chat
   */
  updateChat: async (
    chatId: string,
    updateData: { name?: string }
  ): Promise<MeowChat> => {
    return await apiClient.put(API_ENDPOINTS.CHATS.UPDATE(chatId), updateData);
  },

  /**
   * Delete chat
   */
  deleteChat: async (chatId: string): Promise<void> => {
    return await apiClient.delete(API_ENDPOINTS.CHATS.DELETE(chatId));
  },

  /**
   * Add participants to chat
   */
  addParticipants: async (
    chatId: string,
    participants: string[]
  ): Promise<MeowChat> => {
    return await apiClient.post(API_ENDPOINTS.CHATS.ADD_PARTICIPANTS(chatId), {
      participants,
    });
  },

  /**
   * Remove participant from chat
   */
  removeParticipant: async (
    chatId: string,
    userId: string
  ): Promise<MeowChat> => {
    return await apiClient.delete(
      API_ENDPOINTS.CHATS.REMOVE_PARTICIPANT(chatId, userId)
    );
  },
};

/**
 * Message API
 */
export const meowChatMessageAPI = {
  /**
   * Get messages for a chat
   */
  getMessages: async (
    chatId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: MeowChatMessage[]; hasMore: boolean }> => {
    return await apiClient.get(API_ENDPOINTS.MESSAGES.GET(chatId), {
      page,
      limit,
    });
  },

  /**
   * Send a message
   */
  sendMessage: async (
    chatId: string,
    messageData: {
      content: string;
      type?: "text" | "image" | "file";
      replyTo?: string;
    }
  ): Promise<MeowChatMessage> => {
    return await apiClient.post(
      API_ENDPOINTS.MESSAGES.SEND(chatId),
      messageData
    );
  },

  /**
   * Edit a message
   */
  editMessage: async (
    messageId: string,
    content: string
  ): Promise<MeowChatMessage> => {
    return await apiClient.put(API_ENDPOINTS.MESSAGES.EDIT(messageId), {
      content,
    });
  },

  /**
   * Delete a message
   */
  deleteMessage: async (messageId: string): Promise<void> => {
    return await apiClient.delete(API_ENDPOINTS.MESSAGES.DELETE(messageId));
  },

  /**
   * Upload file/image with message
   */
  uploadMessage: async (
    chatId: string,
    file: any,
    messageData?: { content?: string }
  ): Promise<MeowChatMessage> => {
    return await apiClient.upload(
      API_ENDPOINTS.MESSAGES.UPLOAD(chatId),
      file,
      messageData
    );
  },

  /**
   * Add reaction to message
   */
  addReaction: async (
    messageId: string,
    emoji: string
  ): Promise<MeowChatMessage> => {
    return await apiClient.post(
      API_ENDPOINTS.MESSAGES.ADD_REACTION(messageId),
      { emoji }
    );
  },

  /**
   * Remove reaction from message
   */
  removeReaction: async (messageId: string): Promise<MeowChatMessage> => {
    return await apiClient.delete(
      API_ENDPOINTS.MESSAGES.REMOVE_REACTION(messageId)
    );
  },
};

export default {
  auth: meowChatAuthAPI,
  chats: meowChatAPI,
  messages: meowChatMessageAPI,
};
