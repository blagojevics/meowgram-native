import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  Image,
  SafeAreaView,
  StatusBar,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { MessageList } from "../components/MessageList";
import { MessageInput } from "../components/MessageInput";
import { TypingIndicator } from "../components/TypingIndicator";
import { getOtherParticipant, getTimeDiffFromNow } from "../services/chatUtils";

interface ChatDetailScreenProps {
  navigation: any;
  route: any;
}

export const ChatDetailScreen: React.FC<ChatDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { conversationId } = route.params || {};
  const {
    selectedConversation,
    selectConversation,
    deleteMessage,
    editMessage,
    messages,
    userPresences,
    conversations,
  } = useChat();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const dims = useWindowDimensions();

  // Ensure conversation is selected when screen loads
  useEffect(() => {
    if (
      conversationId &&
      (!selectedConversation || selectedConversation.id !== conversationId)
    ) {
      console.log("[ChatDetail] Selecting conversation:", conversationId);
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        selectConversation(conversation);
      } else {
        console.warn("[ChatDetail] Conversation not found:", conversationId);
      }
    }
  }, [conversationId, selectedConversation, conversations, selectConversation]);

  // Get other participant for header
  const otherParticipantId =
    selectedConversation &&
    getOtherParticipant(selectedConversation, user?.uid || "");
  const otherParticipantPresence = otherParticipantId
    ? userPresences[otherParticipantId]
    : null;

  // Get the OTHER participant's details (not current user)
  const otherParticipant =
    selectedConversation?.participantDetails && otherParticipantId
      ? selectedConversation.participantDetails[otherParticipantId]
      : null;

  const handleMessageLongPress = useCallback(
    (messageId: string, senderId: string) => {
      if (senderId !== user?.uid) {
        Alert.alert("Message Options", "You can view this message", [
          { text: "OK", style: "cancel" },
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
              "This message will be deleted for everyone.",
              [
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteMessage(messageId);
                      Alert.alert("Success", "Message deleted");
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

  const handleBackPress = useCallback(() => {
    selectConversation(null);
    navigation.goBack();
  }, [selectConversation, navigation]);

  const handleCallPress = useCallback(() => {
    Alert.alert("Voice Call", "Voice calling feature coming soon!", [
      { text: "OK", style: "cancel" },
    ]);
  }, []);

  const handleVideoPress = useCallback(() => {
    Alert.alert("Video Call", "Video calling feature coming soon!", [
      { text: "OK", style: "cancel" },
    ]);
  }, []);

  const handleInfoPress = useCallback(() => {
    navigation.navigate("ConversationInfo" as never);
  }, [navigation]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bgPrimary}
      />

      {/* Chat Header */}
      <View
        style={[
          styles.chatHeader,
          {
            backgroundColor: colors.bgPrimary,
            borderBottomColor: colors.borderColor,
          },
        ]}
      >
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerInfo} onPress={handleInfoPress}>
          <Image
            source={
              otherParticipant?.avatarUrl
                ? { uri: otherParticipant.avatarUrl }
                : require("../../assets/placeholderImg.jpg")
            }
            style={styles.headerAvatar}
          />

          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerName, { color: colors.textPrimary }]}>
              {otherParticipant?.displayName || "Unknown"}
            </Text>
            {/* Online status removed - keeping only typing and read indicators */}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton} onPress={handleCallPress}>
          <Ionicons name="call" size={22} color="#FF6B6B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleVideoPress}
        >
          <Ionicons name="videocam" size={22} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.messagesContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <MessageList onMessageLongPress={handleMessageLongPress} />

        {/* Typing Indicator */}
        <TypingIndicator />

        {/* Message Input */}
        <MessageInput />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: "600",
  },
  headerStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  onlineStatus: {
    color: "#31A24C",
    fontSize: 16,
    marginRight: 4,
  },
  offlineStatus: {
    fontSize: 12,
  },
  headerButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
});

export default ChatDetailScreen;
