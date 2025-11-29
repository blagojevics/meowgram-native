import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { formatMessageTime, getMessagePreview } from "../services/chatUtils";
import { getUserProfile } from "../services/userService";

interface ConversationListScreenProps {
  navigation: any;
}

export const ConversationListScreen: React.FC<ConversationListScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const {
    conversations,
    conversationsLoading,
    conversationsError,
    totalUnreadCount,
    selectConversation,
    refreshConversations,
  } = useChat();

  const [refreshing, setRefreshing] = useState(false);
  const [enhancedConversations, setEnhancedConversations] = useState<any[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Fetch participant details for conversations that don't have them
  useEffect(() => {
    const fetchMissingDetails = async () => {
      if (!user) {
        setEnhancedConversations([]);
        return;
      }

      if (conversations.length === 0) {
        setEnhancedConversations([]);
        setIsEnhancing(false);
        return;
      }

      setIsEnhancing(true);
      // Processing conversations

      const enhanced = await Promise.all(
        conversations.map(async (conv) => {
          // If participantDetails already exists, use it
          if (conv.participantDetails) {
            // Conversation has participant details
            return conv;
          }

          // Otherwise, fetch the other participant's data
          // Fetching missing participant details
          const otherParticipantId = conv.participants.find(
            (p: string) => p !== user.uid
          );

          if (!otherParticipantId) {
            return conv;
          }

          try {
            const otherUser = await getUserProfile(otherParticipantId);
            // Fetched participant

            if (!otherUser) {
              return conv;
            }

            return {
              ...conv,
              participantDetails: {
                [user.uid]: {
                  uid: user.uid,
                  username: user.displayName || "You",
                  displayName: user.displayName || "You",
                  avatarUrl: user.photoURL || "",
                },
                [otherParticipantId]: {
                  uid: otherUser.uid,
                  username: otherUser.username,
                  displayName: otherUser.displayName || otherUser.username,
                  avatarUrl: otherUser.avatarUrl || "",
                },
              },
            };
          } catch (error) {
            return conv;
          }
        })
      );

      // Enhanced conversations ready
      setEnhancedConversations(enhanced);
      setIsEnhancing(false);
    };

    fetchMissingDetails();
  }, [conversations, user]);

  const sortedConversations = React.useMemo(() => {
    return [...enhancedConversations].sort(
      (a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp
    );
  }, [enhancedConversations]);

  const handleSelectConversation = useCallback(
    async (conversation: any) => {
      await selectConversation(conversation);
      navigation.navigate("ChatDetail", { conversationId: conversation.id });
    },
    [navigation, selectConversation]
  );

  const handleNewChat = useCallback(() => {
    navigation.navigate("SearchUsers");
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Manual refresh triggered
    refreshConversations();
    // Wait for the subscription to update
    setTimeout(() => {
      setRefreshing(false);
      // Refresh complete
    }, 1000);
  }, [refreshConversations, conversations.length]);

  const renderConversationItem = ({ item: conversation }: any) => {
    const otherParticipant = conversation.participantDetails
      ? (Object.values(conversation.participantDetails)[0] as any)
      : null;

    const hasUnread = conversation.unreadCount > 0;
    const messagePreview = getMessagePreview(conversation.lastMessage);

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          { borderBottomColor: colors.borderLight },
          hasUnread && [
            styles.unreadConversation,
            { backgroundColor: colors.bgSecondary },
          ],
        ]}
        onPress={() => handleSelectConversation(conversation)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={
              otherParticipant?.avatarUrl
                ? { uri: otherParticipant.avatarUrl }
                : require("../../assets/placeholderImg.jpg")
            }
            style={styles.avatar}
          />
          {/* Online indicator removed */}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[
                styles.conversationName,
                { color: colors.textPrimary },
                hasUnread && [styles.unreadName, { color: colors.textPrimary }],
              ]}
              numberOfLines={1}
            >
              {otherParticipant?.displayName || "Unknown"}
            </Text>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {formatMessageTime(conversation.lastMessageTimestamp)}
            </Text>
          </View>

          <Text
            style={[
              styles.messagePreview,
              { color: colors.textSecondary },
              hasUnread && [
                styles.unreadMessage,
                { color: colors.textPrimary },
              ],
            ]}
            numberOfLines={2}
          >
            {messagePreview}
          </Text>
        </View>

        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View
      style={[styles.emptyContainer, { backgroundColor: colors.bgPrimary }]}
    >
      <Ionicons name="chatbubble-outline" size={64} color={colors.textMuted} />
      <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
        No conversations yet
      </Text>
      <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
        Start chatting with your MeowGram friends
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleNewChat}>
        <Text style={styles.emptyButtonText}>Start a Chat</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bgPrimary}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.bgPrimary,
            borderBottomColor: colors.borderColor,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Messages
          </Text>
          {totalUnreadCount > 0 && (
            <Text style={styles.headerSubtitle}>{totalUnreadCount} unread</Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.newChatButton,
            { backgroundColor: colors.bgSecondary },
          ]}
          onPress={handleNewChat}
        >
          <Ionicons name="create" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      {conversationsLoading || isEnhancing ? (
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: colors.bgPrimary },
          ]}
        >
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {conversationsLoading
              ? "Loading conversations..."
              : "Preparing conversations..."}
          </Text>
        </View>
      ) : conversationsError ? (
        <View
          style={[styles.errorContainer, { backgroundColor: colors.bgPrimary }]}
        >
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>Error loading conversations</Text>
          <Text style={[styles.errorSubText, { color: colors.textSecondary }]}>
            {conversationsError.message}
          </Text>
        </View>
      ) : sortedConversations.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {totalUnreadCount > 0 && (
            <View style={styles.unreadBar}>
              <Text style={styles.unreadBarText}>
                {totalUnreadCount} unread message
                {totalUnreadCount !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
          <FlatList
            data={sortedConversations}
            renderItem={renderConversationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            scrollEnabled={true}
            showsVerticalScrollIndicator={true}
            // Pull-to-refresh disabled to reduce Firestore quota usage
            // Each refresh triggers re-reading all conversations
            // refreshControl={
            //   <RefreshControl
            //     refreshing={refreshing}
            //     onRefresh={handleRefresh}
            //     colors={["#FF6B6B"]}
            //     tintColor="#FF6B6B"
            //   />
            // }
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "600",
    marginTop: 2,
  },
  newChatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadBar: {
    backgroundColor: "#FFE6E6",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  unreadBarText: {
    color: "#FF6B6B",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  listContent: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 0.5,
  },
  unreadConversation: {},
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#31A24C",
    borderWidth: 2,
    borderColor: "#fff",
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
    flex: 1,
    marginRight: 8,
  },
  unreadName: {
    fontWeight: "700",
  },
  timestamp: {
    fontSize: 12,
    minWidth: 50,
    textAlign: "right",
  },
  messagePreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadMessage: {
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    minWidth: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B6B",
    marginTop: 12,
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 13,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ConversationListScreen;
