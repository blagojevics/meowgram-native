import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useChat } from "../contexts/ChatContext";

export const TypingIndicator: React.FC = () => {
  const { typingUsers } = useChat();
  const [dotAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnimation, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(dotAnimation, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [dotAnimation]);

  if (typingUsers.length === 0) {
    return null;
  }

  const typingUsersList = typingUsers
    .map((user) => user.username)
    .slice(0, 2)
    .join(" and ");

  const typingText =
    typingUsers.length === 1
      ? `${typingUsersList} is typing`
      : `${typingUsersList} ${
          typingUsers.length > 2 ? "and others " : ""
        }are typing`;

  return (
    <View style={styles.container}>
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: dotAnimation.interpolate({
                inputRange: [0, 0.33, 0.66, 1],
                outputRange: [0.4, 1, 0.4, 0.4],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: dotAnimation.interpolate({
                inputRange: [0, 0.33, 0.66, 1],
                outputRange: [0.4, 0.4, 1, 0.4],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: dotAnimation.interpolate({
                inputRange: [0, 0.33, 0.66, 1],
                outputRange: [0.4, 0.4, 0.4, 1],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.typingText}>{typingText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 4,
    marginRight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#999",
  },
  typingText: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
  },
});
