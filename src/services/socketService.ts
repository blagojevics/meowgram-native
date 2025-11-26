/**
 * Socket.IO Service for MeowChat Backend Integration
 * Real-time messaging using Firebase auth only (no MongoDB users)
 */

import io, { Socket } from "socket.io-client";
import { auth } from "../config/firebase";
import { API_BASE_URL } from "../config/api";

export interface SocketMessage {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
    profilePicture?: string;
    firebaseUid: string;
  };
  chat: string;
  type: "text" | "image" | "file";
  fileUrl?: string;
  createdAt: Date;
  readBy: string[];
}

export interface TypingIndicator {
  chatId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface UserStatus {
  userId: string;
  isOnline: boolean;
  lastSeen?: Date;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * Connect to Socket.IO server with Firebase token
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.socket) {
      console.log("[Socket] Already connected");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No authenticated user");
      }

      const firebaseToken = await user.getIdToken();

      console.log("[Socket] Connecting to:", API_BASE_URL);

      this.socket = io(API_BASE_URL, {
        auth: {
          token: firebaseToken,
          firebaseUid: user.uid,
          username: user.displayName || user.email?.split("@")[0] || "User",
          email: user.email,
          profilePicture: user.photoURL,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      this.setupEventListeners();
    } catch (error) {
      console.error("[Socket] Connection error:", error);
      throw error;
    }
  }

  /**
   * Setup Socket.IO event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("[Socket] Connected:", this.socket?.id);
      this.isConnected = true;
      this.emit("socket_connected", { socketId: this.socket?.id });
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      this.isConnected = false;
      this.emit("socket_disconnected", { reason });
    });

    this.socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error);
      this.emit("socket_error", { error: error.message });
    });

    // Message events
    this.socket.on("new_message", (message: SocketMessage) => {
      console.log("[Socket] New message:", message._id);
      this.emit("new_message", message);
    });

    this.socket.on(
      "message_edited",
      (data: { messageId: string; content: string }) => {
        console.log("[Socket] Message edited:", data.messageId);
        this.emit("message_edited", data);
      }
    );

    this.socket.on("message_deleted", (data: { messageId: string }) => {
      console.log("[Socket] Message deleted:", data.messageId);
      this.emit("message_deleted", data);
    });

    // Typing indicators
    this.socket.on("user_typing", (data: TypingIndicator) => {
      this.emit("user_typing", data);
    });

    this.socket.on("user_stopped_typing", (data: TypingIndicator) => {
      this.emit("user_stopped_typing", data);
    });

    // User status events
    this.socket.on("user_online", (data: UserStatus) => {
      console.log("[Socket] User online:", data.userId);
      this.emit("user_online", data);
    });

    this.socket.on("user_offline", (data: UserStatus) => {
      console.log("[Socket] User offline:", data.userId);
      this.emit("user_offline", data);
    });

    // Chat events
    this.socket.on("chat_created", (chat: any) => {
      console.log("[Socket] Chat created:", chat._id);
      this.emit("chat_created", chat);
    });

    this.socket.on("chat_updated", (chat: any) => {
      console.log("[Socket] Chat updated:", chat._id);
      this.emit("chat_updated", chat);
    });

    // Reaction events
    this.socket.on(
      "reaction_added",
      (data: { messageId: string; reaction: any }) => {
        this.emit("reaction_added", data);
      }
    );

    this.socket.on(
      "reaction_removed",
      (data: { messageId: string; userId: string }) => {
        this.emit("reaction_removed", data);
      }
    );
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      console.log("[Socket] Disconnecting...");
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  /**
   * Join a chat room
   */
  joinChat(chatId: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn("[Socket] Not connected, cannot join chat");
      return;
    }

    console.log("[Socket] Joining chat:", chatId);
    this.socket.emit("join_chat", { chatId });
  }

  /**
   * Leave a chat room
   */
  leaveChat(chatId: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn("[Socket] Not connected, cannot leave chat");
      return;
    }

    console.log("[Socket] Leaving chat:", chatId);
    this.socket.emit("leave_chat", { chatId });
  }

  /**
   * Send a message
   */
  sendMessage(
    chatId: string,
    content: string,
    type: "text" | "image" | "file" = "text"
  ): void {
    if (!this.socket || !this.isConnected) {
      console.warn("[Socket] Not connected, cannot send message");
      return;
    }

    console.log("[Socket] Sending message to chat:", chatId);
    this.socket.emit("send_message", { chatId, content, type });
  }

  /**
   * Send typing indicator
   */
  sendTyping(chatId: string, isTyping: boolean): void {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit("typing", { chatId, isTyping });
  }

  /**
   * Mark message as read
   */
  markAsRead(messageId: string): void {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit("mark_read", { messageId });
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit event to local listeners
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Socket] Error in ${event} callback:`, error);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket !== null;
  }

  /**
   * Get socket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
