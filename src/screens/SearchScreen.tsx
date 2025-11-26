import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import ScreenHeader from "../components/ScreenHeader";
import ProgressiveImage from "../components/ProgressiveImage";
import { getOptimizedImageUrl } from "../services/imageOptimization";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../config/firebase";

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "MainTabs">;

interface UserResult {
  id: string;
  uid: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
}

interface PostResult {
  id: string;
  imageUrl: string;
  caption?: string;
  userId: string;
  username: string;
  userAvatar?: string;
  createdAt: any;
}

const SearchScreen: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [postResults, setPostResults] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recommendedUsers, setRecommendedUsers] = useState<UserResult[]>([]);
  const [recommendedPosts, setRecommendedPosts] = useState<PostResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load recommended content on mount
  useEffect(() => {
    fetchRecommended();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch(searchQuery.trim());
      } else {
        setUserResults([]);
        setPostResults([]);
        setHasSearched(false);
        // fetch recommended users/posts when search is cleared
        fetchRecommended();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery) return;

    setLoading(true);
    try {
      // Search users
      const usersQuery = query(
        collection(db, "users"),
        where("username", ">=", searchQuery.toLowerCase()),
        where("username", "<=", searchQuery.toLowerCase() + "\uf8ff"),
        limit(10)
      );

      const usersSnap = await getDocs(usersQuery);
      const users = usersSnap.docs.map((doc) => ({
        ...(doc.data() as UserResult),
        id: doc.id,
      }));

      // Search posts by caption
      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const postsSnap = await getDocs(postsQuery);
      const allPosts = postsSnap.docs.map((doc) => ({
        ...(doc.data() as PostResult),
        id: doc.id,
      }));

      // Filter posts that contain the search query in caption
      const filteredPosts = allPosts.filter(
        (post) =>
          post.caption &&
          post.caption.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Get user data for posts
      const userIds = [...new Set(filteredPosts.map((post) => post.userId))];
      const userPromises = userIds.map(async (userId) => {
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", userId)
        );
        const userDoc = await getDocs(userQuery);
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data() as UserResult;
          return {
            userId,
            username: userData.username,
            avatarUrl: userData.avatarUrl,
          };
        }
        return { userId, username: "Unknown", avatarUrl: undefined };
      });

      const userDataResults = await Promise.all(userPromises);
      const userDataMap = Object.fromEntries(
        userDataResults.map(({ userId, username, avatarUrl }) => [
          userId,
          { username, avatarUrl },
        ])
      );

      // Add user data to posts
      const postsWithUserData = filteredPosts.map((post) => ({
        ...post,
        username: userDataMap[post.userId]?.username || "Unknown",
        userAvatar: userDataMap[post.userId]?.avatarUrl,
      }));

      setUserResults(users);
      setPostResults(postsWithUserData.slice(0, 10)); // Limit to 10 posts
      setHasSearched(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommended = async () => {
    try {
      // Recommended users: latest 5 users
      const usersQuery = query(
        collection(db, "users"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const usersSnap = await getDocs(usersQuery);
      const recUsers = usersSnap.docs.map((doc) => ({
        ...(doc.data() as UserResult),
        id: doc.id,
      }));

      // Recommended posts: latest 6 posts
      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        limit(12)
      );
      const postsSnap = await getDocs(postsQuery);
      const recentPosts = postsSnap.docs.map((doc) => ({
        ...(doc.data() as PostResult),
        id: doc.id,
      }));

      // Fetch post owners for mapping
      const userIds = [...new Set(recentPosts.map((p) => p.userId))];
      const userPromises = userIds.map(async (userId) => {
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", userId)
        );
        const userDoc = await getDocs(userQuery);
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data() as UserResult;
          return {
            userId,
            username: userData.username,
            avatarUrl: userData.avatarUrl,
          };
        }
        return { userId, username: "Unknown", avatarUrl: undefined };
      });

      const userDataResults = await Promise.all(userPromises);
      const userDataMap = Object.fromEntries(
        userDataResults.map(({ userId, username, avatarUrl }) => [
          userId,
          { username, avatarUrl },
        ])
      );

      const recPosts = recentPosts.slice(0, 6).map((post) => ({
        ...post,
        username: userDataMap[post.userId]?.username || "Unknown",
        userAvatar: userDataMap[post.userId]?.avatarUrl,
      }));

      setRecommendedUsers(recUsers);
      setRecommendedPosts(recPosts);
    } catch (err) {
      console.error("Failed to load recommended items:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRecommended();
    setRefreshing(false);
  };

  const renderUserResult = React.useCallback(
    ({ item }: { item: UserResult }) => (
      <TouchableOpacity
        style={[styles.userResult, { backgroundColor: colors.bgSecondary }]}
        onPress={() => {
          // Navigate to user profile (use Firestore doc id)
          navigation.navigate("UserProfile", { userId: item.id });
        }}
      >
        <Image
          source={
            item.avatarUrl
              ? {
                  uri: getOptimizedImageUrl(item.avatarUrl, "thumbnail"),
                }
              : require("../../assets/placeholderImg.jpg")
          }
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: colors.textPrimary }]}>
            {item.username}
          </Text>
          {item.bio && (
            <Text
              style={[styles.userBio, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {item.bio}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    [colors, navigation]
  );

  const renderPostResult = React.useCallback(
    ({ item }: { item: PostResult }) => (
      <TouchableOpacity
        style={[styles.postResult, { backgroundColor: colors.bgSecondary }]}
        onPress={() => {
          // Navigate to post detail
          navigation.navigate("PostDetail", { postId: item.id });
        }}
      >
        {item.imageUrl ? (
          <Image
            source={{
              uri: getOptimizedImageUrl(item.imageUrl, "medium"),
            }}
            style={styles.postImage}
            resizeMode="cover"
            defaultSource={require("../../assets/placeholderImg.jpg")}
          />
        ) : (
          <Image
            source={require("../../assets/placeholderImg.jpg")}
            style={styles.postImage}
          />
        )}
        <View style={styles.postInfo}>
          <Text
            style={[styles.postCaption, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {item.caption || "No caption"}
          </Text>
          <Text style={[styles.postUser, { color: colors.textSecondary }]}>
            by {item.username}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [colors, navigation]
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
    >
      <ScreenHeader title="Search" showLogo={false} />

      {/* Search Input */}
      <View
        style={[
          styles.searchContainer,
          { borderBottomColor: colors.borderColor },
        ]}
      >
        <TextInput
          style={[
            styles.searchInput,
            { borderColor: colors.borderColor, color: colors.textPrimary },
          ]}
          placeholder="Search users and posts..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
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
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={() => (
            <View>
              {/* Users Section */}
              {userResults.length > 0 && (
                <View style={styles.section}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary }]}
                  >
                    Users
                  </Text>
                  <FlatList
                    data={userResults}
                    renderItem={renderUserResult}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.usersList}
                  />
                </View>
              )}

              {/* Posts Section */}
              {postResults.length > 0 && (
                <View style={styles.section}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary }]}
                  >
                    Posts
                  </Text>
                  <FlatList
                    data={postResults}
                    renderItem={renderPostResult}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.postsGrid}
                  />
                </View>
              )}

              {/* No Results */}
              {userResults.length === 0 && postResults.length === 0 && (
                <View style={styles.noResults}>
                  <Text
                    style={[
                      styles.noResultsText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    No results found for "{searchQuery}"
                  </Text>
                </View>
              )}
            </View>
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      ) : (
        // Show recommended users & posts when user hasn't searched yet
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={() => (
            <View>
              {/* Recommended Users Section */}
              {recommendedUsers.length > 0 && (
                <View style={styles.section}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary }]}
                  >
                    Recommended Users
                  </Text>
                  <FlatList
                    data={recommendedUsers}
                    renderItem={renderUserResult}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.usersList}
                  />
                </View>
              )}

              {/* Recommended Posts Section */}
              {recommendedPosts.length > 0 && (
                <View style={styles.section}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary }]}
                  >
                    Recommended Posts
                  </Text>
                  <FlatList
                    data={recommendedPosts}
                    renderItem={renderPostResult}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.postsGrid}
                  />
                </View>
              )}

              {/* Fallback message if no recommendations */}
              {recommendedUsers.length === 0 &&
                recommendedPosts.length === 0 && (
                  <View style={styles.initialState}>
                    <Text
                      style={[styles.initialText, { color: colors.textMuted }]}
                    >
                      Start typing to search
                    </Text>
                  </View>
                )}
            </View>
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width > 550 ? width * 0.5 : width,
    alignSelf: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
  comingSoon: {
    fontSize: 14,
    textAlign: "center",
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  usersList: {
    paddingVertical: 10,
  },
  userResult: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginRight: 10,
    borderRadius: 10,
    minWidth: 120,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
  },
  userBio: {
    fontSize: 14,
    marginTop: 2,
  },
  postsGrid: {
    paddingBottom: 20,
  },
  postResult: {
    flex: 1,
    margin: 5,
    borderRadius: 10,
    overflow: "hidden",
  },
  postImage: {
    width: "100%",
    height: 150,
    resizeMode: "cover",
  },
  postInfo: {
    padding: 10,
  },
  postCaption: {
    fontSize: 14,
    marginBottom: 5,
  },
  postUser: {
    fontSize: 12,
  },
  noResults: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: "center",
  },
  initialState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  initialText: {
    fontSize: 16,
  },
});

export default SearchScreen;
