import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import ScreenHeader from "../components/ScreenHeader";
import { getOptimizedImageUrl } from "../services/imageOptimization";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import PostPreview from "../components/PostPreview";

const { width } = Dimensions.get("window");
const PAGE_SIZE = 20;

interface Notification {
  id: string;
  userId: string;
  fromUserId: string;
  type: "follow" | "like" | "comment" | "commentLike";
  postId?: string;
  commentId?: string;
  createdAt: any;
  read: boolean;
}

interface UserData {
  uid: string;
  username: string;
  avatarUrl?: string;
}

const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const lastDocRef = useRef<any>(null);
  const [usersMap, setUsersMap] = useState<Record<string, UserData>>({});
  const unsubscribeRef = useRef<() => void | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Subscribe to recent notifications (real-time) and keep lastDoc for pagination
  useEffect(() => {
    if (!user) return;

    setInitialLoading(true);

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Notification[];
        // update lastDoc for pagination
        lastDocRef.current = snap.docs[snap.docs.length - 1] || null;

        // fetch any missing user data
        const userIds = [
          ...new Set(docs.map((n) => n.fromUserId).filter(Boolean)),
        ];
        const missing = userIds.filter((id) => id && !usersMap[id]);
        if (missing.length > 0) {
          const promises = missing.map(async (uid) => {
            const res = await getDocs(
              query(collection(db, "users"), where("uid", "==", uid))
            );
            if (!res.empty)
              return { uid, data: res.docs[0].data() as UserData };
            return null;
          });
          const results = await Promise.all(promises);
          const newMap = { ...usersMap };
          results.forEach((r) => {
            if (r) newMap[r.uid] = r.data;
          });
          setUsersMap(newMap);
        }

        setNotifications(docs);
        setHasMore(snap.docs.length === PAGE_SIZE);
        setInitialLoading(false);

        // Mark all unread notifications as read when opening the screen
        const unreadNotifications = docs.filter((n) => !n.read);
        if (unreadNotifications.length > 0) {
          const markReadPromises = unreadNotifications.map((n) =>
            updateDoc(doc(db, "notifications", n.id), { read: true })
          );
          await Promise.all(markReadPromises);
        }
      },
      (err) => {
        console.error("Notifications onSnapshot error:", err);
        setInitialLoading(false);
      }
    );

    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load older notifications (pagination)
  const loadMore = async () => {
    if (!user || loading || !hasMore) return;
    if (!lastDocRef.current) return;

    setLoading(true);
    try {
      let q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Notification[];

      // fetch user data for any missing fromUserId
      const userIds = [
        ...new Set(list.map((n) => n.fromUserId).filter(Boolean)),
      ];
      const missing = userIds.filter((id) => id && !usersMap[id]);
      if (missing.length > 0) {
        const promises = missing.map(async (uid) => {
          const res = await getDocs(
            query(collection(db, "users"), where("uid", "==", uid))
          );
          if (!res.empty) return { uid, data: res.docs[0].data() as UserData };
          return null;
        });
        const results = await Promise.all(promises);
        const newMap = { ...usersMap };
        results.forEach((r) => {
          if (r) newMap[r.uid] = r.data;
        });
        setUsersMap(newMap);
      }

      setNotifications((prev) => [...prev, ...list]);
      lastDocRef.current =
        snap.docs[snap.docs.length - 1] || lastDocRef.current;
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Error loading more notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Notification[];

      // Update lastDoc for pagination
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;

      // Fetch user data for notifications
      const userIds = [
        ...new Set(docs.map((n) => n.fromUserId).filter(Boolean)),
      ];
      const missing = userIds.filter((id) => id && !usersMap[id]);
      if (missing.length > 0) {
        const promises = missing.map(async (uid) => {
          const res = await getDocs(
            query(collection(db, "users"), where("uid", "==", uid))
          );
          if (!res.empty) return { uid, data: res.docs[0].data() as UserData };
          return null;
        });
        const results = await Promise.all(promises);
        const newMap = { ...usersMap };
        results.forEach((r) => {
          if (r) newMap[r.uid] = r.data;
        });
        setUsersMap(newMap);
      }

      setNotifications(docs);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Error refreshing notifications:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const fromUser = usersMap[item.fromUserId];
    const username = fromUser?.username || "Someone";

    const onUsernamePress = () => {
      if (!item.read) markAsRead(item.id);
      try {
        if (item.fromUserId) {
          navigation.navigate("UserProfile", { userId: item.fromUserId });
        }
      } catch (err) {
        console.warn("Navigation failed for username:", err);
      }
    };

    const onNotificationPress = () => {
      if (!item.read) markAsRead(item.id);
      try {
        // For follow notifications, clicking outside username does nothing special
        // For like/comment notifications, clicking outside username goes to post
        if (item.type !== "follow" && item.postId) {
          navigation.navigate("PostDetail", { postId: item.postId });
        }
      } catch (err) {
        console.warn("Navigation failed for notification:", err);
      }
    };

    const getMessageParts = (n: Notification) => {
      switch (n.type) {
        case "follow":
          return { action: "started following you" };
        case "like":
          return { action: "liked your post" };
        case "comment":
          return { action: "commented on your post" };
        case "commentLike":
          return { action: "liked your comment" };
        default:
          return { action: "interacted with you" };
      }
    };

    const messageParts = getMessageParts(item);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            borderBottomColor: colors.borderColor,
            backgroundColor: colors.bgPrimary,
          },
          !item.read && [
            styles.unreadNotification,
            { backgroundColor: colors.bgSecondary },
          ],
        ]}
        onPress={onNotificationPress}
      >
        <Image
          source={
            fromUser?.avatarUrl
              ? {
                  uri: getOptimizedImageUrl(fromUser.avatarUrl, "thumbnail"),
                }
              : require("../../assets/placeholderImg.jpg")
          }
          style={styles.avatar}
        />
        <View style={styles.notificationContent}>
          <View style={styles.notificationTextContainer}>
            <TouchableOpacity onPress={onUsernamePress}>
              <Text style={[styles.usernameText, { color: "#333" }]}>
                {username}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>
              {" " + messageParts.action}
            </Text>
          </View>
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
        {item.postId && <PostPreview postId={item.postId} />}
        {!item.read && (
          <View
            style={[styles.unreadDot, { backgroundColor: colors.brandPrimary }]}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      >
        <ScreenHeader title="Notifications" showLogo={false} />
        <Text style={{ color: colors.textPrimary }}>
          Please log in to view notifications
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
    >
      <ScreenHeader title="Notifications" showLogo={false} />

      {initialLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.brandPrimary}
          style={styles.loader}
        />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No notifications yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            When someone interacts with you, you'll see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.notificationsList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={
            loading ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : null
          }
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
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  notificationsList: {
    paddingVertical: 10,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
  },
  unreadNotification: {
    // backgroundColor handled inline
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  usernameText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  actionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default NotificationsScreen;
