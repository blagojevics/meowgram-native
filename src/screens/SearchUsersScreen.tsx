import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { getOptimizedImageUrl } from "../services/imageOptimization";
import { useChatNavigation } from "../hooks/useChatNavigation";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";

interface UserResult {
  id: string;
  uid: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

const SearchUsersScreen: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { startNewChat } = useChatNavigation();

  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recommendedUsers, setRecommendedUsers] = useState<UserResult[]>([]);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch(searchQuery.trim());
      } else {
        setUserResults([]);
        setHasSearched(false);
        fetchRecommendedUsers();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load recommended users on mount
  useEffect(() => {
    fetchRecommendedUsers();
  }, []);

  const performSearch = async (searchText: string) => {
    if (!searchText) return;

    setLoading(true);
    try {
      console.log("[SearchUsers] Searching for:", searchText);
      const searchLower = searchText.toLowerCase();
      const usersQuery = query(
        collection(db, "users"),
        where("username", ">=", searchLower),
        where("username", "<=", searchLower + "\uf8ff"),
        limit(20)
      );

      const usersSnap = await getDocs(usersQuery);
      console.log(
        "[SearchUsers] Raw query found",
        usersSnap.docs.length,
        "users"
      );

      // Log first few usernames to debug
      if (usersSnap.docs.length > 0) {
        console.log(
          "[SearchUsers] Sample usernames:",
          usersSnap.docs.slice(0, 3).map((d) => d.data().username)
        );
      }

      const users = usersSnap.docs
        .map((doc) => ({
          ...(doc.data() as UserResult),
          id: doc.id,
        }))
        .filter((u) => u.uid !== user?.uid); // Exclude current user

      console.log(
        "[SearchUsers] After filtering current user:",
        users.length,
        "users"
      );
      setUserResults(users);
      setHasSearched(true);
    } catch (error) {
      console.error("[SearchUsers] Search error:", error);
      alert(
        `Search failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedUsers = async () => {
    try {
      console.log("[SearchUsers] Fetching all users");
      // Get ALL users, no limit
      const usersSnap = await getDocs(collection(db, "users"));
      console.log("[SearchUsers] Found", usersSnap.docs.length, "total users");

      // Log usernames to see the format
      console.log(
        "[SearchUsers] All usernames:",
        usersSnap.docs.map((d) => d.data().username).join(", ")
      );

      const users = usersSnap.docs
        .map((doc) => ({
          ...(doc.data() as UserResult),
          id: doc.id,
        }))
        .filter((u) => u.uid !== user?.uid) // Exclude current user
        .sort((a, b) => (a.username || "").localeCompare(b.username || "")); // Sort alphabetically

      console.log("[SearchUsers] After filtering:", users.length, "users");
      setRecommendedUsers(users);
    } catch (error) {
      console.error("[SearchUsers] Failed to load users:", error);
      // Don't show alert for recommended users failure, just log it
    }
  };

  const handleStartChat = async (selectedUser: UserResult) => {
    if (!selectedUser.uid) {
      console.error("User UID is missing");
      return;
    }

    setStartingChat(selectedUser.uid);
    try {
      console.log(
        "[SearchUsers] Starting chat with:",
        selectedUser.username,
        selectedUser.uid
      );
      await startNewChat(selectedUser.uid);
      // Navigation happens in startNewChat hook
      console.log("[SearchUsers] Chat started successfully");
    } catch (error) {
      console.error("Failed to start chat:", error);
      // Show error to user
      if (error instanceof Error) {
        alert(`Failed to start chat: ${error.message}`);
      } else {
        alert("Failed to start chat. Please try again.");
      }
    } finally {
      setStartingChat(null);
    }
  };

  const renderUserItem = ({ item }: { item: UserResult }) => (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: colors.bgSecondary }]}
      onPress={() => handleStartChat(item)}
      disabled={startingChat === item.uid}
    >
      <Image
        source={
          item.avatarUrl
            ? { uri: getOptimizedImageUrl(item.avatarUrl, "thumbnail") }
            : require("../../assets/placeholderImg.jpg")
        }
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: colors.textPrimary }]}>
          {item.username}
        </Text>
        {item.displayName && (
          <Text style={[styles.displayName, { color: colors.textSecondary }]}>
            {item.displayName}
          </Text>
        )}
        {item.bio && (
          <Text
            style={[styles.bio, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.bio}
          </Text>
        )}
      </View>
      {startingChat === item.uid ? (
        <ActivityIndicator size="small" color={colors.brandPrimary} />
      ) : (
        <Ionicons
          name="chatbubble-outline"
          size={24}
          color={colors.brandPrimary}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          New Message
        </Text>
      </View>

      {/* Search Input */}
      <View
        style={[
          styles.searchContainer,
          { borderBottomColor: colors.borderColor },
        ]}
      >
        <Ionicons
          name="search"
          size={20}
          color={colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search users..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={true}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Searching...
          </Text>
        </View>
      ) : hasSearched ? (
        userResults.length > 0 ? (
          <FlatList
            data={userResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No users found for "{searchQuery}"
            </Text>
          </View>
        )
      ) : (
        <View>
          {recommendedUsers.length > 0 && (
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.textSecondary }]}
              >
                Suggested
              </Text>
              <FlatList
                data={recommendedUsers}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
              />
            </View>
          )}
        </View>
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
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
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: "uppercase",
  },
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  displayName: {
    fontSize: 14,
    marginBottom: 2,
  },
  bio: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
});

export default SearchUsersScreen;
