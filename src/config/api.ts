/**
 * API Configuration for MeowChat Backend Integration
 * Bridge between Meowgram-native (Firebase) and MeowChat backend (MongoDB)
 */

// Backend API URL - Railway production deployment
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_CHAT_API_URL ||
  "https://meowchat-backend-production-0763.up.railway.app";
export const API_VERSION = "/api";

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    FIREBASE_LOGIN: `${API_VERSION}/auth/firebase-login`,
    MEOWGRAM_LOGIN: `${API_VERSION}/auth/meowgram-login`,
    ME: `${API_VERSION}/auth/me`,
    LOGOUT: `${API_VERSION}/auth/logout`,
    SEARCH_USERS: `${API_VERSION}/auth/search-users`,
  },

  // Chat endpoints
  CHATS: {
    LIST: `${API_VERSION}/chats`,
    CREATE: `${API_VERSION}/chats`,
    GET: (chatId: string) => `${API_VERSION}/chats/${chatId}`,
    UPDATE: (chatId: string) => `${API_VERSION}/chats/${chatId}`,
    DELETE: (chatId: string) => `${API_VERSION}/chats/${chatId}`,
    ADD_PARTICIPANTS: (chatId: string) =>
      `${API_VERSION}/chats/${chatId}/participants`,
    REMOVE_PARTICIPANT: (chatId: string, userId: string) =>
      `${API_VERSION}/chats/${chatId}/participants/${userId}`,
  },

  // Message endpoints
  MESSAGES: {
    GET: (chatId: string) => `${API_VERSION}/messages/${chatId}`,
    SEND: (chatId: string) => `${API_VERSION}/messages/${chatId}`,
    EDIT: (messageId: string) => `${API_VERSION}/messages/${messageId}`,
    DELETE: (messageId: string) => `${API_VERSION}/messages/${messageId}`,
    UPLOAD: (chatId: string) => `${API_VERSION}/messages/${chatId}/upload`,
    ADD_REACTION: (messageId: string) =>
      `${API_VERSION}/messages/${messageId}/reactions`,
    REMOVE_REACTION: (messageId: string) =>
      `${API_VERSION}/messages/${messageId}/reactions`,
  },
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
