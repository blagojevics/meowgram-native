import React, { useState, useEffect } from "react";
import {
  Image,
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { getProgressiveImageUrls } from "../services/imageOptimization";

interface ProgressiveImageProps {
  source: string;
  style?: any;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
  showPlaceholder?: boolean;
  placeholderColor?: string;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  source,
  style,
  resizeMode = "cover",
  onLoadStart,
  onLoadEnd,
  onError,
  showPlaceholder = true,
  placeholderColor = "#e0e0e0",
}) => {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [thumbnailOpacity] = useState(new Animated.Value(0));
  const [fullOpacity] = useState(new Animated.Value(0));
  const [error, setError] = useState(false);

  const urls = getProgressiveImageUrls(source);

  useEffect(() => {
    if (thumbnailLoaded) {
      Animated.timing(thumbnailOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [thumbnailLoaded]);

  useEffect(() => {
    if (fullLoaded) {
      Animated.timing(fullOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [fullLoaded]);

  const handleThumbnailLoad = () => {
    setThumbnailLoaded(true);
    onLoadStart?.();
  };

  const handleFullLoad = () => {
    setFullLoaded(true);
    onLoadEnd?.();
  };

  const handleError = () => {
    setError(true);
    setFullLoaded(true);
    onError?.();
  };

  return (
    <View
      style={[style, { backgroundColor: placeholderColor, overflow: "hidden" }]}
    >
      {/* Thumbnail (low quality, fast load) */}
      {!error && (
        <Animated.Image
          source={{ uri: urls.thumbnail }}
          style={[
            style,
            StyleSheet.absoluteFill,
            { opacity: thumbnailOpacity },
          ]}
          resizeMode={resizeMode}
          onLoad={handleThumbnailLoad}
          onError={() => {
            console.log(
              "[ProgressiveImage] Thumbnail load error for:",
              urls.thumbnail
            );
            setThumbnailLoaded(true);
          }}
        />
      )}

      {/* Full quality image with fade-in */}
      {!error && (
        <Animated.Image
          source={{ uri: urls.full }}
          style={[style, StyleSheet.absoluteFill, { opacity: fullOpacity }]}
          resizeMode={resizeMode}
          onLoad={handleFullLoad}
          onError={handleError}
        />
      )}

      {/* Loading indicator while thumbnail is loading */}
      {!thumbnailLoaded && !error && showPlaceholder && (
        <View style={[styles.placeholder, style]}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      )}

      {/* Error state - show placeholder */}
      {error && (
        <View style={[styles.placeholder, style]}>
          <ActivityIndicator size="small" color="#ccc" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
});

export default ProgressiveImage;
