import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { moderateImageWithAI } from "../services/aiModeration";
import { RouteProp, useRoute } from "@react-navigation/native";
import ScreenHeader from "../components/ScreenHeader";

type AddPostScreenRouteProp = RouteProp<RootStackParamList, "AddPost">;

type AddPostScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AddPost"
>;

const AddPostScreen: React.FC = () => {
  const navigation = useNavigation<AddPostScreenNavigationProp>();
  const route = useRoute<AddPostScreenRouteProp>();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [caption, setCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [moderationMessage, setModerationMessage] = useState("");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [userDoc, setUserDoc] = useState<any>(null);

  useEffect(() => {
    if (route.params?.selectedImage) {
      setSelectedImage(route.params.selectedImage);
    }
  }, [route.params?.selectedImage]);

  // Fetch user document
  useEffect(() => {
    if (!user) return;

    const fetchUserDoc = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserDoc(userDocSnap.data());
        }
      } catch (error) {
        console.error("Error fetching user document:", error);
      }
    };

    fetchUserDoc();
  }, [user]);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant camera roll permissions to upload images."
        );
      }
    })();
  }, []);

  // Request camera permission as well
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        // Not forcing alert here because some users may not use camera
        console.log("Camera permission not granted");
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        setModerationMessage("");
        setAiAnalyzing(true);

        // AI moderation check
        try {
          const aiResult = await moderateImageWithAI(imageUri, "post image");
          if (!aiResult.isAllowed) {
            setModerationMessage(`🚫 ${aiResult.reason}`);
          } else {
            setModerationMessage("✅ Image approved!");
          }
        } catch (error) {
          console.error("AI moderation failed:", error);
          setModerationMessage(
            "⚠️ Could not verify image. Please ensure it follows community guidelines."
          );
        } finally {
          setAiAnalyzing(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        setModerationMessage("");
        setAiAnalyzing(true);

        // AI moderation check
        try {
          const aiResult = await moderateImageWithAI(imageUri, "post image");
          if (!aiResult.isAllowed) {
            setModerationMessage(`🚫 ${aiResult.reason}`);
          } else {
            setModerationMessage("✅ Image approved!");
          }
        } catch (error) {
          console.error("AI moderation failed:", error);
          setModerationMessage(
            "⚠️ Could not verify image. Please ensure it follows community guidelines."
          );
        } finally {
          setAiAnalyzing(false);
        }
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const showImageOptions = () => {
    const options: any[] = [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickImage },
    ];

    if (selectedImage) {
      options.unshift({
        text: "Remove Photo",
        onPress: () => {
          setSelectedImage(null);
          setModerationMessage("");
        },
        style: "destructive",
      });
    }

    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Add Photo", "Choose an option", options as any);
  };

  const uploadToCloudinary = async (imageUri: string) => {
    try {
      let uploadUri = imageUri;

      // Compress and resize before upload to optimize for fast loading
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ImageManipulator = require("expo-image-manipulator");
        if (ImageManipulator && ImageManipulator.manipulateAsync) {
          // Resize to 1080px width (standard for feeds) and compress to 75% quality
          const manipResult = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: 1080 } }],
            {
              compress: 0.75,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );
          uploadUri = manipResult.uri;
          console.log("Image optimized before upload");
        }
      } catch (e) {
        console.log("Image manipulator not available, uploading original");
      }

      const formData = new FormData();

      // Try to infer file extension and mime type
      let fileExtension = "jpg";
      try {
        const maybeExt = imageUri.split(".").pop();
        if (maybeExt && maybeExt.length <= 5 && maybeExt.indexOf("/") === -1) {
          fileExtension = maybeExt;
        }
      } catch (err) {
        // ignore, fallback to jpg
      }

      const mimeType = `image/${
        fileExtension === "jpg" ? "jpeg" : fileExtension
      }`;
      const fileName = `post_${Date.now()}.${fileExtension}`;

      formData.append("file", {
        uri: uploadUri,
        type: mimeType,
        name: fileName,
      } as any);

      formData.append(
        "upload_preset",
        process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
      );
      formData.append(
        "cloud_name",
        process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!
      );
      // Enable automatic optimization on Cloudinary's end
      formData.append("quality", "auto");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText} ${text}`
        );
      }

      const result = await response.json();
      return result.secure_url;
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      throw err;
    }
  };

  const handleSubmit = async () => {
    if (!user || !userDoc) {
      Alert.alert("Error", "Please log in to create a post");
      return;
    }

    if (!selectedImage) {
      Alert.alert("Error", "Please select an image");
      return;
    }

    // Caption is optional now — allow empty captions

    if (moderationMessage.includes("🚫")) {
      Alert.alert(
        "Content Warning",
        "Please choose a different image that follows community guidelines."
      );
      return;
    }

    setLoading(true);

    try {
      // Upload image to Cloudinary
      const imageUrl = await uploadToCloudinary(selectedImage);

      // Create post in Firestore
      const postsCollectionRef = collection(db, "posts");

      await addDoc(postsCollectionRef, {
        userId: user.uid,
        username: userDoc?.username || user.displayName || "Unknown User",
        userAvatar: userDoc?.avatarUrl || user.photoURL || "",
        caption: caption.trim(),
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
        likedByUsers: [],
      });

      // Navigate back to home
      navigation.goBack();
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <ScreenHeader
        title="Create New Post"
        showLogo={false}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
          {/* Image Picker */}
          <TouchableOpacity
            onPress={showImageOptions}
            style={{
              borderWidth: 2,
              borderColor: colors.borderLight,
              borderStyle: "dashed",
              borderRadius: 10,
              height: selectedImage ? 400 : 200, // Match Post component height when image selected
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
              backgroundColor: colors.bgSecondary,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {selectedImage ? (
              <>
                <Image
                  source={{ uri: selectedImage }}
                  style={{ width: "100%", height: "100%", borderRadius: 8 }}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(null);
                    setModerationMessage("");
                  }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    padding: 6,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>X</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 40, color: "#ccc", marginBottom: 10 }}>
                  📷
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
                  Tap to select image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* AI Moderation Status */}
          {aiAnalyzing && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 15,
              }}
            >
              <ActivityIndicator size="small" color={colors.brandPrimary} />
              <Text style={{ marginLeft: 10, color: colors.textSecondary }}>
                🤖 AI analyzing image...
              </Text>
            </View>
          )}

          {moderationMessage ? (
            <View
              style={{
                padding: 12,
                borderRadius: 8,
                marginBottom: 20,
                backgroundColor: moderationMessage.includes("🚫")
                  ? colors.bgTertiary
                  : colors.bgSecondary,
                borderColor: moderationMessage.includes("🚫")
                  ? colors.danger
                  : colors.success,
                borderWidth: 1,
              }}
            >
              <Text
                style={{
                  color: moderationMessage.includes("🚫")
                    ? colors.danger
                    : colors.success,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                {moderationMessage}
              </Text>
            </View>
          ) : null}

          {/* Caption Input */}
          <TextInput
            placeholder="Write a caption..."
            placeholderTextColor={colors.textMuted}
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={4}
            style={{
              borderWidth: 1,
              borderColor: colors.borderColor,
              borderRadius: 8,
              padding: 15,
              fontSize: 16,
              textAlignVertical: "top",
              marginBottom: 30,
              minHeight: 100,
              color: colors.textPrimary,
              backgroundColor: colors.bgPrimary,
            }}
          />

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={
              loading || !selectedImage || moderationMessage.includes("🚫")
            }
            style={{
              backgroundColor:
                loading || !selectedImage || moderationMessage.includes("🚫")
                  ? colors.borderLight
                  : colors.brandPrimary,
              paddingVertical: 15,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
                Share Post
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddPostScreen;
