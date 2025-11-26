import React, { useEffect, useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { getOptimizedImageUrl } from "../services/imageOptimization";

interface PostPreviewProps {
  postId: string;
}

const PostPreview: React.FC<PostPreviewProps> = ({ postId }) => {
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const snap = await getDoc(doc(db, "posts", postId));
        if (snap.exists()) {
          setPost({ id: snap.id, ...snap.data() });
        }
      } catch (error) {
        console.error("Error fetching post for preview:", error);
      }
    };
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  if (!post?.imageUrl) return null;

  return (
    <View style={styles.container}>
      <Image
        source={{
          uri: getOptimizedImageUrl(post.imageUrl, "thumbnail"),
        }}
        style={styles.image}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginLeft: 12,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
});

export default PostPreview;
