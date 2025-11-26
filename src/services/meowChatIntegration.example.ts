/**
 * Example: How to integrate MeowChat backend with Meowgram-native
 *
 * This demonstrates Firebase-only authentication (no MongoDB user management)
 * Users are authenticated via Firebase, backend auto-creates chat records
 */

import { useEffect, useState } from "react";
import { auth } from "../config/firebase";
import socketService from "../services/socketService";
import meowChatAPI, { MeowChatMessage } from "../services/meowChatAPI";

/**
 * STEP 1: Setup in App.tsx or AuthContext
 * Initialize Socket connection when user logs in
 */
export const initializeMeowChat = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user logged in");
      return;
    }

    console.log("[MeowChat] Authenticating user:", user.uid);

    // Authenticate with backend (auto-creates user record if needed)
    const { user: backendUser } =
      await meowChatAPI.auth.authenticateWithFirebase();
    console.log("[MeowChat] Backend user:", backendUser);

    // Connect to Socket.IO for real-time messaging
    await socketService.connect();
    console.log("[MeowChat] Socket connected");
  } catch (error) {
    console.error("[MeowChat] Initialization error:", error);
  }
};

/**
 * STEP 2: Example React Native Component
 * Using MeowChat in a screen
 */
export const ExampleChatScreen = ({ chatId }: { chatId: string }) => {
  const [messages, setMessages] = useState<MeowChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    // Load chat messages
    const loadMessages = async () => {
      try {
        const { messages } = await meowChatAPI.messages.getMessages(chatId);
        setMessages(messages);
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    loadMessages();

    // Join chat room for real-time updates
    socketService.joinChat(chatId);

    // Listen for new messages
    const handleNewMessage = (message: any) => {
      if (message.chat === chatId) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socketService.on("new_message", handleNewMessage);

    // Cleanup
    return () => {
      socketService.off("new_message", handleNewMessage);
      socketService.leaveChat(chatId);
    };
  }, [chatId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // Send via API (will also emit via socket)
      await meowChatAPI.messages.sendMessage(chatId, {
        content: newMessage,
        type: "text",
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return null; // Your UI here
};

/**
 * STEP 3: Create a chat between Firebase users
 */
export const createDirectChat = async (otherUserFirebaseUid: string) => {
  try {
    // Backend will find user by Firebase UID
    const chat = await meowChatAPI.chats.createChat({
      type: "direct",
      participants: [otherUserFirebaseUid], // Just Firebase UIDs
    });

    console.log("Chat created:", chat._id);
    return chat;
  } catch (error) {
    console.error("Error creating chat:", error);
    throw error;
  }
};

/**
 * STEP 4: Search for users to chat with
 */
export const searchMeowgramUsers = async (searchQuery: string) => {
  try {
    // Backend searches Firebase users
    const users = await meowChatAPI.auth.searchUsers(searchQuery);
    return users;
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};

/**
 * STEP 5: Cleanup on logout
 */
export const cleanupMeowChat = () => {
  socketService.disconnect();
  console.log("[MeowChat] Disconnected");
};

/**
 * ENVIRONMENT SETUP:
 *
 * Add to your .env file:
 * EXPO_PUBLIC_CHAT_API_URL=http://your-meowchat-backend:5000
 *
 * For local development:
 * EXPO_PUBLIC_CHAT_API_URL=http://localhost:5000
 *
 * For production:
 * EXPO_PUBLIC_CHAT_API_URL=https://your-backend-domain.com
 */

/**
 * BACKEND REQUIREMENTS:
 *
 * Your MeowChat backend needs to:
 *
 * 1. Accept Firebase tokens in Authorization header
 * 2. Verify Firebase tokens using Firebase Admin SDK
 * 3. Auto-create user records using Firebase user data (uid, email, displayName, photoURL)
 * 4. Use firebaseUid as the primary identifier (not MongoDB _id)
 * 5. Search users by Firebase data
 *
 * Example backend middleware:
 *
 * const verifyFirebaseToken = async (req, res, next) => {
 *   const token = req.headers.authorization?.split('Bearer ')[1];
 *   try {
 *     const decodedToken = await admin.auth().verifyIdToken(token);
 *     req.firebaseUser = decodedToken;
 *
 *     // Auto-create or update user in MongoDB
 *     let user = await User.findOne({ firebaseUid: decodedToken.uid });
 *     if (!user) {
 *       user = await User.create({
 *         firebaseUid: decodedToken.uid,
 *         email: decodedToken.email,
 *         username: decodedToken.name || decodedToken.email.split('@')[0],
 *         profilePicture: decodedToken.picture,
 *       });
 *     }
 *     req.user = user;
 *     next();
 *   } catch (error) {
 *     res.status(401).json({ error: 'Invalid token' });
 *   }
 * };
 */

export default {
  initializeMeowChat,
  cleanupMeowChat,
  createDirectChat,
  searchMeowgramUsers,
};
