import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import { getOptimizedImageUrl } from "../services/imageOptimization";

interface FollowUser {
  id: string;
  uid: string;
  username: string;
  avatarUrl?: string;
  followedAt: Date;
}

interface FollowListModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  type: "followers" | "following";
}

const FollowListModal: React.FC<FollowListModalProps> = ({
  visible,
  onClose,
  userId,
  type,
}) => {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!visible || !userId) return;
    setLoading(true);
    const ref = collection(db, "users", userId, type);
    const unsub = onSnapshot(ref, (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FollowUser[];
      setUsers(usersData);
      setLoading(false);
    });
    return () => unsub();
  }, [userId, type, visible]);

  const renderUserItem = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity
      onPress={() => {
        // close modal then navigate to the selected user's profile
        onClose();
        navigation.navigate("UserProfile", { userId: item.uid || item.id });
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
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
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          marginRight: 15,
        }}
      />
      <Text
        style={{ fontWeight: "600", fontSize: 16, color: colors.textPrimary }}
      >
        {item.username}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: colors.bgPrimary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "70%",
            minHeight: "50%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderColor,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: colors.textPrimary,
              }}
            >
              {type === "followers" ? "Followers" : "Following"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 24, color: colors.textSecondary }}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={colors.brandPrimary} />
            </View>
          ) : (
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <View style={{ alignItems: "center", padding: 50 }}>
                  <Text style={{ color: colors.textSecondary }}>
                    No {type === "followers" ? "followers" : "following"} yet.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export default FollowListModal;
