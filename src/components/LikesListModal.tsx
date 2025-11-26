import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { useTheme } from "../contexts/ThemeContext";
import { getOptimizedImageUrl } from "../services/imageOptimization";

interface LikesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  likedByUsers: string[];
}

const LikesListModal: React.FC<LikesListModalProps> = ({
  isOpen,
  onClose,
  likedByUsers,
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const { colors } = useTheme();

  useEffect(() => {
    if (!isOpen || likedByUsers.length === 0) return;

    const q = query(
      collection(db, "users"),
      where("__name__", "in", likedByUsers.slice(0, 10)) // Firestore 'in' limit is 10
    );

    const unsub = onSnapshot(q, (snap) => {
      const usersData = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    });

    return () => unsub();
  }, [isOpen, likedByUsers]);

  const renderUser = ({ item }: { item: any }) => (
    <View style={[styles.userItem, { borderBottomColor: colors.borderColor }]}>
      <Image
        source={
          item.avatarUrl
            ? {
                uri: getOptimizedImageUrl(item.avatarUrl, "thumbnail"),
              }
            : require("../../assets/placeholderImg.jpg")
        }
        style={styles.avatar}
      />
      <Text style={[styles.username, { color: colors.textPrimary }]}>
        {item.username || "Unknown User"}
      </Text>
    </View>
  );

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.modalContainer, { backgroundColor: colors.bgPrimary }]}
      >
        <View
          style={[styles.header, { borderBottomColor: colors.borderColor }]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>
              ✕
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Likes
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {users.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No likes yet
            </Text>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              renderItem={renderUser}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 8,
  },
  userItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  username: {
    fontSize: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 8,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 50,
  },
});

export default LikesListModal;
