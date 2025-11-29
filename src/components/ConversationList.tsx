import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";
import { formatMessageTime, getMessagePreview } from "../services/chatUtils";
import {
  deleteConversation,
  clearConversationMessages,
} from "../services/conversationService";

interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  onSelectConversation,
}) => {
  const { conversations, conversationsLoading, totalUnreadCount } = useChat();
  const { user } = useAuth();

  const sortedConversations = useMemo(() => {
    return [...conversations].sort(
      (a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp
    );
  }, [conversations]);

  const handleLongPress = (
    conversationId: string,
    otherParticipantName: string
  ) => {
    Alert.alert(
      "Delete Conversation",
      `Delete conversation with ${otherParticipantName}?`,
      [
        {
          text: "Clear Messages",
          onPress: async () => {
            try {
              await clearConversationMessages(conversationId);
              Alert.alert("Success", "Messages cleared");
            } catch (error) {
              console.error("Error clearing messages:", error);
              Alert.alert("Error", "Failed to clear messages");
            }
          },
        },
        {
          text: "Delete Conversation",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteConversation(conversationId, user?.uid || "");
              Alert.alert("Success", "Conversation deleted");
            } catch (error) {
              console.error("Error deleting conversation:", error);
              Alert.alert("Error", "Failed to delete conversation");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  if (conversationsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No conversations yet</Text>
        <Text style={styles.emptySubText}>
          Start a conversation with someone to begin chatting
        </Text>
      </View>
    );
  }

  const renderConversationItem = ({ item }: any) => {
    // Get the OTHER participant (not the current user)
    const otherParticipantId = item.participants.find(
      (id: string) => id !== user?.uid
    );
    const otherParticipant =
      otherParticipantId && item.participantDetails
        ? item.participantDetails[otherParticipantId]
        : null;

    const hasUnread = item.unreadCount > 0;
    const messagePreview = getMessagePreview(item.lastMessage);

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          hasUnread && styles.unreadConversation,
        ]}
        onPress={() => onSelectConversation(item.id)}
        onLongPress={() =>
          handleLongPress(item.id, otherParticipant?.displayName || "Unknown")
        }
        delayLongPress={500}
      >
        <Image
          source={{
            uri:
              otherParticipant?.avatarUrl ||
              "https://via.placeholder.com/48?text=Avatar",
          }}
          style={styles.avatar}
        />

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[styles.conversationName, hasUnread && styles.unreadName]}
              numberOfLines={1}
            >
              {otherParticipant?.displayName || "Unknown"}
            </Text>
            <Text style={styles.timestamp}>
              {formatMessageTime(item.lastMessageTimestamp)}
            </Text>
          </View>

          <Text
            style={[styles.messagePreview, hasUnread && styles.unreadMessage]}
            numberOfLines={2}
          >
            {messagePreview}
          </Text>
        </View>

        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {totalUnreadCount > 0 && (
        <View style={styles.totalUnreadBar}>
          <Text style={styles.totalUnreadText}>
            {totalUnreadCount} unread message{totalUnreadCount > 1 ? "s" : ""}
          </Text>
        </View>
      )}

      <FlatList
        data={sortedConversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
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
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  totalUnreadBar: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  totalUnreadText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  listContent: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  unreadConversation: {
    backgroundColor: "#fafafa",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  unreadName: {
    fontWeight: "700",
    color: "#000",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginLeft: 8,
  },
  messagePreview: {
    fontSize: 13,
    color: "#666",
  },
  unreadMessage: {
    color: "#333",
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
