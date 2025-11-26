import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useTheme } from "../contexts/ThemeContext";
import * as ImagePicker from "expo-image-picker";
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
} from "../config/cloudinary";
import { moderateImageWithAI } from "../services/aiModeration";
import { getOptimizedImageUrl } from "../services/imageOptimization";

interface UserProfile {
  uid: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  currentUser,
  onProfileUpdate,
}) => {
  const [displayName, setDisplayName] = useState(
    currentUser?.displayName || ""
  );
  const [username, setUsername] = useState(currentUser?.username || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [moderationMessage, setModerationMessage] = useState("");
  const { colors } = useTheme();

  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission required",
          "Permission to access camera roll is required!"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadAvatar = async (imageUri: string) => {
    setUploadingAvatar(true);
    setModerationMessage("");

    try {
      // AI moderation check
      const aiResult = await moderateImageWithAI(imageUri, "profile avatar");

      if (!aiResult.isAllowed) {
        setModerationMessage(`🚫 ${aiResult.reason}`);
        Alert.alert("Upload Blocked", aiResult.reason);
        return;
      }

      setModerationMessage("🤖 AI approved! Uploading...");

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", {
        uri: imageUri,
        type: "image/jpeg",
        name: "avatar.jpg",
      } as any);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.secure_url) {
        setAvatarUrl(data.secure_url);
        setModerationMessage("✅ Avatar uploaded successfully!");
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Avatar upload failed:", error);
      setModerationMessage("❌ Upload failed");
      Alert.alert("Error", "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = () => {
    setAvatarUrl("");
    setModerationMessage("");
  };

  const handleSave = async () => {
    if (!currentUser?.uid) return;

    setLoading(true);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        displayName,
        username,
        bio,
        avatarUrl,
      });

      const updatedProfile = {
        ...currentUser,
        displayName,
        username,
        bio,
        avatarUrl,
      };

      onProfileUpdate(updatedProfile);
    } catch (err) {
      console.error("Failed to update profile:", err);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(currentUser?.displayName || "");
    setUsername(currentUser?.username || "");
    setBio(currentUser?.bio || "");
    setAvatarUrl(currentUser?.avatarUrl || "");
    setModerationMessage("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: colors.bgPrimary,
            borderRadius: 12,
            width: "90%",
            maxWidth: 400,
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              marginBottom: 20,
              textAlign: "center",
              color: colors.textPrimary,
            }}
          >
            Edit Profile
          </Text>

          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontWeight: "600",
                marginBottom: 5,
                color: colors.textPrimary,
              }}
            >
              Display Name
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.borderColor,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: colors.textPrimary,
                backgroundColor: colors.bgSecondary,
              }}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your display name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontWeight: "600",
                marginBottom: 5,
                color: colors.textPrimary,
              }}
            >
              Username
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.borderColor,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: colors.textPrimary,
                backgroundColor: colors.bgSecondary,
              }}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>

          <View style={{ marginBottom: 30 }}>
            <Text
              style={{
                fontWeight: "600",
                marginBottom: 5,
                color: colors.textPrimary,
              }}
            >
              Bio
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.borderColor,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                height: 80,
                textAlignVertical: "top",
                color: colors.textPrimary,
                backgroundColor: colors.bgSecondary,
              }}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={{ marginBottom: 30 }}>
            <Text
              style={{
                fontWeight: "600",
                marginBottom: 10,
                color: colors.textPrimary,
              }}
            >
              Avatar
            </Text>

            {avatarUrl ? (
              <View style={{ alignItems: "center", marginBottom: 10 }}>
                <Image
                  source={{
                    uri: getOptimizedImageUrl(avatarUrl, "thumbnail"),
                  }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    marginBottom: 10,
                  }}
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.brandPrimary,
                      paddingHorizontal: 15,
                      paddingVertical: 8,
                      borderRadius: 6,
                    }}
                    onPress={pickImage}
                    disabled={uploadingAvatar}
                  >
                    <Text
                      style={{
                        color: colors.bgPrimary,
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      {uploadingAvatar ? "Uploading..." : "Change Avatar"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.bgSecondary,
                      paddingHorizontal: 15,
                      paddingVertical: 8,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: colors.borderColor,
                    }}
                    onPress={removeAvatar}
                  >
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.bgSecondary,
                  padding: 20,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  borderStyle: "dashed",
                  alignItems: "center",
                }}
                onPress={pickImage}
                disabled={uploadingAvatar}
              >
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 16,
                    marginBottom: 5,
                  }}
                >
                  {uploadingAvatar ? "Uploading..." : "Tap to add avatar"}
                </Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 14,
                  }}
                >
                  Choose from gallery
                </Text>
              </TouchableOpacity>
            )}

            {moderationMessage ? (
              <Text
                style={{
                  fontSize: 14,
                  color: moderationMessage.includes("🚫")
                    ? "#e74c3c"
                    : moderationMessage.includes("✅")
                    ? "#27ae60"
                    : colors.textMuted,
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                {moderationMessage}
              </Text>
            ) : null}
          </View>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: colors.bgSecondary,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 8,
                flex: 1,
                marginRight: 10,
              }}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "600",
                  color: colors.textPrimary,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.brandPrimary,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 8,
                flex: 1,
                marginLeft: 10,
              }}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.bgPrimary} />
              ) : (
                <Text
                  style={{
                    color: colors.bgPrimary,
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditProfileModal;
