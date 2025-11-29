import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Keyboard,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  increment,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useTheme } from "../contexts/ThemeContext";

interface CommentInputProps {
  postId: string;
  currentUser: any;
  post: any;
}

const CommentInput: React.FC<CommentInputProps> = ({
  postId,
  currentUser,
  post,
}) => {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const { colors } = useTheme();

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    Keyboard.dismiss();

    const commentData = {
      postId,
      authorId: currentUser?.uid,
      text: trimmed,
      createdAt: serverTimestamp(),
      likes: [],
    };

    try {
      await addDoc(collection(db, "comments"), commentData);
      await updateDoc(doc(db, "posts", postId), {
        commentsCount: increment(1),
      });

      // Create notification for post owner (if not commenting on own post)
      if (post.userId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: post.userId,
          fromUserId: currentUser.uid,
          type: "comment",
          postId,
          commentText: trimmed,
          createdAt: serverTimestamp(),
          read: false,
        });
      }

      setText("");
    } catch (err) {
      console.error("Failed to post comment:", err);
      Alert.alert("Error", "Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: any) => {
    // Enter now creates new line instead of sending
    // Send button handles submission
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        {currentUser?.avatarUrl || currentUser?.photoURL ? (
          <Image
            source={{ uri: currentUser?.avatarUrl || currentUser?.photoURL }}
            style={[styles.avatar, { borderColor: colors.borderColor }]}
          />
        ) : (
          <Image
            source={require("../../assets/placeholderImg.jpg")}
            style={[styles.avatar, { borderColor: colors.borderColor }]}
          />
        )}

        <TextInput
          ref={textInputRef}
          value={text}
          onChangeText={setText}
          placeholder="Write a comment..."
          placeholderTextColor={colors.textMuted}
          style={[
            styles.textInput,
            {
              color: colors.textPrimary,
              borderColor: colors.borderLight,
              backgroundColor: colors.bgSecondary,
            },
          ]}
          multiline
          maxLength={500}
          onKeyPress={handleKeyPress}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!text.trim() || isSubmitting}
          style={[
            styles.submitButton,
            {
              backgroundColor:
                !text.trim() || isSubmitting
                  ? colors.bgSecondary
                  : colors.brandPrimary,
            },
            (!text.trim() || isSubmitting) && styles.submitButtonDisabled,
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={!text.trim() || isSubmitting ? colors.textMuted : "#FFFFFF"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 12,
    // make input area visually blend with post card (transparent)
    backgroundColor: "transparent",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    // transparent background and subtle border to match card
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
    minHeight: 36,
    textAlignVertical: "center",
  },
  submitButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#f0f0f0",
  },
});

export default CommentInput;
