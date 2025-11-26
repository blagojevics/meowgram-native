import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";
import { ConversationList } from "../components/ConversationList";
import { MessageList } from "../components/MessageList";
import { MessageInput } from "../components/MessageInput";
import { TypingIndicator } from "../components/TypingIndicator";
import { getOtherParticipant } from "../services/chatUtils";

interface ChatScreenProps {
  navigation?: any;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation }) => {
  const {
    selectedConversation,
    selectConversation,
    deleteMessage,
    editMessage,
    messages,
    userPresences,
  } = useChat();
  const { user } = useAuth();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      const conversation = { id: conversationId } as any;
      await selectConversation(conversation);
    },
    [selectConversation]
  );

  const handleMessageLongPress = useCallback(
    (messageId: string, senderId: string) => {
      if (senderId !== user?.uid) {
        // Can't edit/delete other people's messages
        Alert.alert("Message Options", "You can only delete this message", [
          { text: "Cancel", style: "cancel" },
        ]);
        return;
      }

      Alert.alert("Message Options", "What would you like to do?", [
        {
          text: "Edit",
          onPress: () => {
            setEditingMessageId(messageId);
          },
        },
        {
          text: "Delete",
          onPress: () => {
            Alert.alert(
              "Delete Message",
              "Are you sure you want to delete this message?",
              [
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteMessage(messageId);
                    } catch (error) {
                      Alert.alert("Error", "Failed to delete message");
                    }
                  },
                },
                { text: "Cancel", style: "cancel" },
              ]
            );
          },
          style: "destructive",
        },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [user?.uid, deleteMessage]
  );

  const handleEditMessage = useCallback(
    async (newText: string) => {
      if (!editingMessageId) return;

      try {
        await editMessage(editingMessageId, newText);
        setEditingMessageId(null);
        Alert.alert("Success", "Message updated");
      } catch (error) {
        Alert.alert("Error", "Failed to edit message");
      }
    },
    [editingMessageId, editMessage]
  );

  // Get other participant for header
  const otherParticipantId =
    selectedConversation &&
    getOtherParticipant(selectedConversation, user?.uid || "");
  const otherParticipantPresence = otherParticipantId
    ? userPresences[otherParticipantId]
    : null;

  if (!selectedConversation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <ConversationList onSelectConversation={handleSelectConversation} />
      </View>
    );
  }

  const otherParticipant = selectedConversation.participantDetails
    ? Object.values(selectedConversation.participantDetails)[0]
    : null;

  return (
    <View style={styles.container}>
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={() => selectConversation(null)}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>

        <Image
          source={{
            uri:
              otherParticipant?.avatarUrl ||
              "https://via.placeholder.com/40?text=Avatar",
          }}
          style={styles.headerAvatar}
        />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {otherParticipant?.displayName || "Unknown"}
          </Text>
          <Text style={styles.headerStatus}>
            {otherParticipantPresence?.isOnline ? "Online" : "Offline"}
          </Text>
        </View>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="call" size={24} color="#FF6B6B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="videocam" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <MessageList onMessageLongPress={handleMessageLongPress} />

      {/* Typing Indicator */}
      <TypingIndicator />

      {/* Message Input */}
      <MessageInput />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
    gap: 8,
  },
  backButton: {
    padding: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  headerStatus: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
});

export default ChatScreen;
