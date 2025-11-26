import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  collection,
  addDoc,
  serverTimestamp,
  deleteDoc,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import timeFormat from "../config/timeFormat";
import CommentInput from "../components/CommentInput";
import CommentItem from "../components/CommentItem";
import LikesListModal from "../components/LikesListModal";
import ProgressiveImage from "../components/ProgressiveImage";
import { getOptimizedImageUrl } from "../services/imageOptimization";

type PostDetailScreenRouteProp = RouteProp<RootStackParamList, "PostDetail">;
type PostDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "PostDetail"
>;

interface Post {
  id: string;
  imageUrl: string;
  caption?: string;
  userId: string;
  createdAt: any;
  likesCount?: number;
  commentsCount?: number;
  likedByUsers?: string[];
  username?: string;
  userAvatar?: string;
}

interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string;
  createdAt: any;
  likes?: string[];
}

const { width } = Dimensions.get("window");

const PostDetailScreen: React.FC = () => {
  const route = useRoute<PostDetailScreenRouteProp>();
  const navigation = useNavigation<PostDetailScreenNavigationProp>();
  const { user } = useAuth();

  const postId = route.params?.postId;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isUpdatingLike, setIsUpdatingLike] = useState(false);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [showLikes, setShowLikes] = useState(false);

  // Fetch current user document
  useEffect(() => {
    if (!user) {
      setUserDoc(null);
      return;
    }
    const fetchUserDoc = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserDoc(userDocSnap.data());
        } else {
          setUserDoc(null);
        }
      } catch (error) {
        setUserDoc(null);
      }
    };
    fetchUserDoc();
  }, [user]);

  const currentUser = user
    ? {
        uid: user.uid,
        username: userDoc?.username || "",
        avatarUrl: userDoc?.avatarUrl || "",
        photoURL: userDoc?.photoURL || "",
      }
    : null;

  // Load post data
  useEffect(() => {
    if (!postId) return;

    const postUnsub = onSnapshot(doc(db, "posts", postId), (snap) => {
      if (snap.exists()) {
        const postData = { id: snap.id, ...snap.data() } as Post;
        setPost(postData);
        setIsLiked(
          (user && postData.likedByUsers?.includes(user.uid)) || false
        );
        setLikesCount(postData.likesCount || 0);
      }
      setLoading(false);
    });

    return () => postUnsub();
  }, [postId, user]);

  // Load comments
  useEffect(() => {
    if (!postId) return;

    const commentsUnsub = onSnapshot(
      query(collection(db, "comments"), where("postId", "==", postId)),
      (snapshot) => {
        const commentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Comment[];

        const getMs = (t: any) => {
          if (!t) return 0;
          if (t.toDate) return t.toDate().getTime();
          if (t.seconds) return t.seconds * 1000;
          if (typeof t === "number") return t > 1e12 ? t : t * 1000;
          if (typeof t === "string") {
            const n = Date.parse(t);
            return isNaN(n) ? 0 : n;
          }
          if (t instanceof Date) return t.getTime();
          return 0;
        };

        setComments(
          commentsData.sort((a, b) => getMs(b.createdAt) - getMs(a.createdAt))
        );
      }
    );

    return () => commentsUnsub();
  }, [postId]);

  const handleLikeToggle = async () => {
    if (!user || !post) return;

    const postRef = doc(db, "posts", post.id);
    const alreadyLiked = post.likedByUsers?.includes(user.uid);

    console.log("[LIKE-POST-DETAIL] Starting like toggle on post...");
    console.log(`[LIKE-POST-DETAIL] User ID: ${user.uid}`);
    console.log(`[LIKE-POST-DETAIL] Post ID: ${post.id}`);
    console.log(`[LIKE-POST-DETAIL] Is Liked: ${alreadyLiked}`);

    try {
      if (isUpdatingLike) return;
      setIsUpdatingLike(true);

      if (alreadyLiked) {
        console.log("[LIKE-POST-DETAIL] Removing like from post...");
        try {
          await updateDoc(postRef, {
            likedByUsers: arrayRemove(user.uid),
            likesCount: increment(-1),
          });
          console.log("[LIKE-POST-DETAIL] Like removed from post successfully");
        } catch (updateError: any) {
          console.error(
            "[LIKE-POST-DETAIL] ERROR UPDATING POST (UNLIKE):",
            updateError?.message
          );
          console.error("[LIKE-POST-DETAIL] Error code:", updateError?.code);
          throw updateError;
        }
      } else {
        console.log("[LIKE-POST-DETAIL] Adding like to post...");
        try {
          await updateDoc(postRef, {
            likedByUsers: arrayUnion(user.uid),
            likesCount: increment(1),
          });
          console.log("[LIKE-POST-DETAIL] Like added to post successfully");
        } catch (updateError: any) {
          console.error(
            "[LIKE-POST-DETAIL] ERROR UPDATING POST (LIKE):",
            updateError?.message
          );
          console.error("[LIKE-POST-DETAIL] Error code:", updateError?.code);
          throw updateError;
        }

        // Create notification
        if (post.userId !== user.uid) {
          try {
            await addDoc(collection(db, "notifications"), {
              userId: post.userId,
              fromUserId: user.uid,
              type: "like",
              postId: post.id,
              postCaption: post.caption,
              createdAt: serverTimestamp(),
              read: false,
            });
            console.log("[LIKE-POST-DETAIL] Like notification created");
          } catch (notifError: any) {
            console.error(
              "[LIKE-POST-DETAIL] ERROR CREATING NOTIFICATION:",
              notifError?.message
            );
            // Don't throw - notification failure shouldn't prevent the like
          }
        }
      }
    } catch (err: any) {
      console.error("[LIKE-POST-DETAIL] Error toggling like:", err);
      console.error("[LIKE-POST-DETAIL] Error code:", err?.code);
      console.error("[LIKE-POST-DETAIL] Error message:", err?.message);
      Alert.alert("Error", "Failed to update like");
    } finally {
      setIsUpdatingLike(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !user || post.userId !== user.uid) return;

    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "posts", post.id));
            navigation.goBack();
          } catch (err) {
            console.error("Error deleting post:", err);
            Alert.alert("Error", "Failed to delete post");
          }
        },
      },
    ]);
  };

  const handleDeleteComment = async (comment: Comment) => {
    if (!user || (comment.authorId !== user.uid && post?.userId !== user.uid))
      return;

    try {
      await deleteDoc(doc(db, "comments", comment.id));
      await updateDoc(doc(db, "posts", postId!), {
        commentsCount: increment(-1),
      });
      // Update local state to remove the comment immediately
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
    } catch (err) {
      console.error("Error deleting comment:", err);
      Alert.alert("Error", "Failed to delete comment");
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading post...</Text>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text>Post not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 15,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#eee",
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 18, color: "#007AFF" }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "600", marginLeft: 20 }}>
          Post
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Post Content */}
        <View style={{ padding: 15 }}>
          {/* Post Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <Image
              source={
                post.userAvatar
                  ? {
                      uri: getOptimizedImageUrl(post.userAvatar, "thumbnail"),
                    }
                  : require("../../assets/placeholderImg.jpg")
              }
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                marginRight: 10,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", fontSize: 16 }}>
                {post.username || "Unknown User"}
              </Text>
              <Text style={{ color: "#666", fontSize: 12 }}>
                {post.createdAt ? timeFormat(post.createdAt) : "Just now"}
              </Text>
            </View>
            {user && user.uid === post.userId && (
              <TouchableOpacity onPress={handleDeletePost}>
                <Text style={{ fontSize: 20, color: "#666" }}>⋯</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Post Image */}
          <ProgressiveImage
            source={post.imageUrl}
            style={{
              width: width - 30,
              height: width - 30,
              borderRadius: 10,
              marginBottom: 15,
            }}
            resizeMode="cover"
          />

          {/* Actions */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <TouchableOpacity
              onPress={handleLikeToggle}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginRight: 6,
              }}
            >
              <FontAwesome
                name="paw"
                size={22}
                color={isLiked ? "#e74c3c" : "gray"}
                style={{ marginRight: 0 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowLikes(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginRight: 10,
              }}
            >
              <Text style={{ fontSize: 16 }}>{likesCount}</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FontAwesome
                name="comment"
                size={20}
                color="gray"
                style={{ marginRight: 5 }}
              />
              <Text style={{ fontSize: 16 }}>{comments.length}</Text>
            </View>
          </View>

          {/* Post Caption */}
          {post.caption && (
            <Text style={{ fontSize: 16, lineHeight: 22, marginBottom: 15 }}>
              {post.caption}
            </Text>
          )}
        </View>

        {/* Comments Section */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#eee",
            paddingHorizontal: 15,
            paddingTop: 10,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 15 }}>
            Comments ({comments.length})
          </Text>

          {comments.length === 0 ? (
            <Text
              style={{
                color: "#666",
                textAlign: "center",
                paddingVertical: 20,
              }}
            >
              No comments yet. Be the first to comment!
            </Text>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                isPostOwner={post?.userId === currentUser?.uid}
                onDelete={handleDeleteComment}
                post={post}
              />
            ))
          )}
        </View>
      </ScrollView>

      {currentUser ? (
        <View style={{ paddingHorizontal: 15, paddingVertical: 10 }}>
          <CommentInput
            post={post}
            postId={postId!}
            currentUser={currentUser}
          />
        </View>
      ) : (
        <View style={{ padding: 15, backgroundColor: "#f8f8f8" }}>
          <Text style={{ textAlign: "center", color: "#666" }}>
            Log in to comment
          </Text>
        </View>
      )}

      <LikesListModal
        isOpen={showLikes}
        onClose={() => setShowLikes(false)}
        likedByUsers={post.likedByUsers || []}
      />
    </SafeAreaView>
  );
};

export default PostDetailScreen;
