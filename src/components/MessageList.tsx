import React, { useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  formatFullTime,
  isMessageDeleted,
  getTimeDiffFromNow,
} from "../services/chatUtils";

interface MessageListProps {
  onMessageLongPress?: (messageId: string, senderId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  onMessageLongPress,
}) => {
  const { messages, messagesLoading, selectedConversation, markAsRead } =
    useChat();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const previousMessageCountRef = useRef(0);

  // Mark-as-read disabled to prevent errors on non-existent message documents
  // Messages are marked as read when conversation is opened via markConversationAsRead

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (
      messages.length > previousMessageCountRef.current &&
      flatListRef.current
    ) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
    previousMessageCountRef.current = messages.length;
  }, [messages]);

  if (messagesLoading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.bgPrimary }]}
      >
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.bgPrimary }]}
      >
        <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
          No messages yet
        </Text>
        <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
          Start the conversation by sending a message
        </Text>
      </View>
    );
  }

  const renderMessage = ({ item: message }: any) => {
    const isOwnMessage = message.senderId === user?.uid;
    const isDeleted = isMessageDeleted(message);

    return (
      <View
        style={[
          styles.messageRow,
          isOwnMessage ? styles.ownMessageRow : styles.otherMessageRow,
        ]}
      >
        {!isOwnMessage && (
          <Image
            source={
              message.senderAvatar
                ? { uri: message.senderAvatar }
                : require("../../assets/placeholderImg.jpg")
            }
            style={styles.senderAvatar}
          />
        )}

        <TouchableOpacity
          style={[
            styles.messageBubble,
            isOwnMessage
              ? styles.ownBubble
              : [
                  styles.otherBubble,
                  { backgroundColor: isDark ? colors.bgTertiary : "#f0f0f0" },
                ],
            isDeleted && styles.deletedBubble,
          ]}
          onLongPress={() => {
            if (onMessageLongPress && !isDeleted) {
              onMessageLongPress(message.id, message.senderId);
            }
          }}
          delayLongPress={500}
        >
          {/* Message header with sender name for others' messages */}
          {!isOwnMessage && (
            <Text style={[styles.senderName, { color: colors.textSecondary }]}>
              {message.senderName}
            </Text>
          )}

          {/* Reply-to indicator */}
          {message.replyTo && (
            <View style={styles.replyToContainer}>
              <Text style={styles.replyToLabel}>
                Replying to {message.replyTo.senderName}
              </Text>
              <Text style={styles.replyToText} numberOfLines={1}>
                {message.replyTo.text}
              </Text>
            </View>
          )}

          {/* Main message content */}
          <Text
            style={[
              styles.messageText,
              isOwnMessage
                ? styles.ownMessageText
                : { color: colors.textPrimary },
              isDeleted && [
                styles.deletedMessageText,
                { color: colors.textMuted },
              ],
            ]}
          >
            {isDeleted ? "[Message deleted]" : message.text}
          </Text>

          {/* Media attachments */}
          {message.mediaUrls && message.mediaUrls.length > 0 && !isDeleted && (
            <View style={styles.mediaContainer}>
              {message.mediaUrls.map((url: string, index: number) => (
                <Image
                  key={`${message.id}_${index}`}
                  source={{ uri: url }}
                  style={styles.mediaImage}
                />
              ))}
            </View>
          )}

          {/* Message footer with time and edit status */}
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwnMessage ? styles.ownTime : { color: colors.textMuted },
              ]}
            >
              {getTimeDiffFromNow(message.timestamp)}
              {message.editedAt && " (edited)"}
            </Text>

            {isOwnMessage && message.isRead && (
              <Text style={styles.readIndicator}>✓✓</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      scrollEnabled={true}
      inverted={false}
      onEndReachedThreshold={0.5}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: "center",
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  ownMessageRow: {
    justifyContent: "flex-end",
  },
  otherMessageRow: {
    justifyContent: "flex-start",
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: "#FF6B6B",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
  },
  deletedBubble: {
    opacity: 0.6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  replyToContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderLeftWidth: 3,
    borderLeftColor: "#FF6B6B",
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 8,
    borderRadius: 4,
  },
  replyToLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
  },
  replyToText: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: "#fff",
  },
  otherMessageText: {},
  deletedMessageText: {
    fontStyle: "italic",
  },
  mediaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 4,
  },
  mediaImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    justifyContent: "flex-end",
  },
  messageTime: {
    fontSize: 11,
  },
  ownTime: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  otherTime: {},
  readIndicator: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    marginLeft: 4,
  },
});
