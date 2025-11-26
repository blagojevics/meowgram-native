import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";
import { getOtherParticipant } from "../services/chatUtils";
import { getOptimizedImageUrl } from "../services/imageOptimization";
import {
  clearConversationMessages,
  deleteConversation,
} from "../services/conversationService";

interface ConversationInfoScreenProps {
  navigation: any;
  route: any;
}

export const ConversationInfoScreen: React.FC<ConversationInfoScreenProps> = ({
  navigation,
  route,
}) => {
  const { selectedConversation, userPresences } = useChat();
  const { user } = useAuth();
  const [notificationsMuted, setNotificationsMuted] = useState(false);

  if (!selectedConversation || !user) {
    navigation.goBack();
    return null;
  }

  const otherParticipantId = getOtherParticipant(
    selectedConversation,
    user.uid
  );

  if (!otherParticipantId) {
    navigation.goBack();
    return null;
  }

  const otherParticipant =
    selectedConversation.participantDetails[otherParticipantId];
  const presence = userPresences[otherParticipantId];

  const handleBlockUser = () => {
    Alert.alert(
      "Block User",
      `Are you sure you want to block ${otherParticipant?.displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Feature Coming Soon",
              "Block user feature will be available soon."
            );
          },
        },
      ]
    );
  };

  const handleReportUser = () => {
    Alert.alert("Report User", `Report ${otherParticipant?.displayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Feature Coming Soon",
            "Report user feature will be available soon."
          );
        },
      },
    ]);
  };

  const handleViewProfile = () => {
    console.log(
      "[ConversationInfo] Navigating to profile:",
      otherParticipantId
    );
    navigation.navigate("Profile", { userId: otherParticipantId });
  };

  const handleClearChat = async () => {
    Alert.alert(
      "Clear Chat History",
      "This will delete all messages in this conversation. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearConversationMessages(selectedConversation.id);
              Alert.alert("Success", "Chat history has been cleared.");
            } catch (error) {
              console.error("Error clearing chat:", error);
              Alert.alert(
                "Error",
                "Failed to clear chat history. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteConversation = async () => {
    Alert.alert(
      "Delete Conversation",
      "This will permanently delete this conversation. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteConversation(selectedConversation.id, user.uid);
              Alert.alert("Success", "Conversation has been deleted.", [
                {
                  text: "OK",
                  onPress: () => {
                    navigation.navigate("ConversationList");
                  },
                },
              ]);
            } catch (error) {
              console.error("Error deleting conversation:", error);
              Alert.alert(
                "Error",
                "Failed to delete conversation. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conversation Info</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <Image
            source={
              otherParticipant?.avatarUrl
                ? {
                    uri: getOptimizedImageUrl(
                      otherParticipant.avatarUrl,
                      "medium"
                    ),
                  }
                : require("../../assets/placeholderImg.jpg")
            }
            style={styles.profileImage}
          />
          <Text style={styles.displayName}>
            {otherParticipant?.displayName || "Unknown"}
          </Text>
          <Text style={styles.username}>@{otherParticipant?.username}</Text>
          {/* Online status removed */}

          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={handleViewProfile}
          >
            <Text style={styles.viewProfileText}>View Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Actions</Text>
          </View>

          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="search" size={22} color="#666" />
            <Text style={styles.actionText}>Search in Conversation</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <View style={styles.actionItem}>
            <Ionicons name="notifications-off" size={22} color="#666" />
            <Text style={styles.actionText}>Mute Notifications</Text>
            <Switch
              value={notificationsMuted}
              onValueChange={setNotificationsMuted}
              trackColor={{ false: "#ddd", true: "#FF6B6B" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Media Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shared Media</Text>
          </View>

          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="images" size={22} color="#666" />
            <Text style={styles.actionText}>Photos & Videos</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="document" size={22} color="#666" />
            <Text style={styles.actionText}>Files</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Manage</Text>
          </View>

          <TouchableOpacity style={styles.actionItem} onPress={handleClearChat}>
            <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
            <Text style={[styles.actionText, styles.dangerText]}>
              Clear Chat History
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleBlockUser}>
            <Ionicons name="ban" size={22} color="#FF6B6B" />
            <Text style={[styles.actionText, styles.dangerText]}>
              Block User
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleReportUser}
          >
            <Ionicons name="flag" size={22} color="#FF6B6B" />
            <Text style={[styles.actionText, styles.dangerText]}>
              Report User
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, styles.lastActionItem]}
            onPress={handleDeleteConversation}
          >
            <Ionicons name="close-circle" size={22} color="#FF6B6B" />
            <Text style={[styles.actionText, styles.dangerText]}>
              Delete Conversation
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Conversation Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Conversation Details</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>
              {new Date(selectedConversation.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Conversation ID</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {selectedConversation.id.substring(0, 20)}...
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#31A24C",
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  viewProfileButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  viewProfileText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  lastActionItem: {
    borderBottomWidth: 0,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    marginLeft: 12,
  },
  dangerText: {
    color: "#FF6B6B",
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
  },
  detailValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },
});

export default ConversationInfoScreen;
