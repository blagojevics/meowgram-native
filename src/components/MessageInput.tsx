import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChat } from "../contexts/ChatContext";

interface MessageInputProps {
  onSendMessage?: () => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const { sendMessage, setTyping, selectedConversation } = useChat();
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle text change (typing indicators disabled to reduce Firestore quota)
  const handleTypingChange = useCallback((text: string) => {
    setMessageText(text);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !selectedConversation || disabled) return;

    setIsLoading(true);
    try {
      await sendMessage(messageText.trim());
      setMessageText("");

      // Clear typing timeout (typing indicators disabled for quota savings)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      onSendMessage?.();
    } catch (error) {
      console.error("Error sending message:", error);
      // Show error feedback
      alert("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [messageText, selectedConversation, sendMessage, disabled, onSendMessage]);

  const handleAttachMedia = useCallback(async () => {
    // TODO: Implement media picker
    console.log("Media attachment not yet implemented");
  }, []);

  return (
    <View style={[styles.container, disabled && styles.disabledContainer]}>
      <TouchableOpacity
        style={[
          styles.iconButton,
          !selectedConversation && styles.disabledButton,
        ]}
        onPress={handleAttachMedia}
        disabled={!selectedConversation || disabled}
      >
        <Ionicons name="add" size={24} color="#FF6B6B" />
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Type a message..."
        placeholderTextColor="#ccc"
        value={messageText}
        onChangeText={handleTypingChange}
        multiline
        maxLength={5000}
        editable={!disabled && !!selectedConversation}
      />

      <TouchableOpacity
        style={[
          styles.iconButton,
          styles.sendButton,
          (!messageText.trim() || isLoading || disabled) &&
            styles.disabledButton,
        ]}
        onPress={handleSendMessage}
        disabled={!messageText.trim() || isLoading || disabled}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FF6B6B" />
        ) : (
          <Ionicons name="send" size={20} color="#FF6B6B" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderTopWidth: 0.5,
    borderTopColor: "#f0f0f0",
    gap: 8,
  },
  disabledContainer: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#333",
    maxHeight: 100,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  sendButton: {
    backgroundColor: "#f0f0f0",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
