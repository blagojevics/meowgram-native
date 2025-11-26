import React from "react";
import { View, Image, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { useChat } from "../contexts/ChatContext";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface ScreenHeaderProps {
  title?: string;
  showThemeToggle?: boolean;
  onThemeToggle?: () => void;
  showChatIcon?: boolean;
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
  showLogo?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showThemeToggle = false,
  onThemeToggle,
  showChatIcon = false,
  rightAction,
  showLogo = false,
  showBackButton = false,
  onBackPress,
}) => {
  const { theme, toggleTheme, colors } = useTheme();
  const { totalUnreadCount } = useChat();
  const navigation = useNavigation<any>();

  const handleThemeToggle = () => {
    toggleTheme();
    onThemeToggle?.();
  };

  const handleChatPress = () => {
    navigation.navigate("ConversationList");
  };

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.bgPrimary,
          borderBottomColor: colors.borderColor,
        },
      ]}
    >
      <View style={styles.leftContainer}>
        {showBackButton && (
          <TouchableOpacity
            onPress={onBackPress}
            style={styles.backButton}
            activeOpacity={0.6}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        {showLogo ? (
          <Image
            source={require("../../assets/logohomepage.png")}
            style={[styles.logoImage, { tintColor: colors.logoColor }]}
            resizeMode="contain"
          />
        ) : (
          title && (
            <Text
              style={[
                styles.title,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              {title}
            </Text>
          )
        )}
      </View>

      <View style={styles.rightContainer}>
        {rightAction && (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.actionButton}
            activeOpacity={0.6}
          >
            <Ionicons
              name={rightAction.icon as any}
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        )}
        {showChatIcon && (
          <TouchableOpacity
            onPress={handleChatPress}
            style={styles.chatButton}
            activeOpacity={0.6}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={24}
              color={colors.textPrimary}
            />
            {totalUnreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {showThemeToggle && (
          <TouchableOpacity
            style={[
              styles.themeToggle,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.borderColor,
              },
            ]}
            onPress={handleThemeToggle}
            activeOpacity={0.6}
          >
            <Text style={{ fontSize: 18, color: colors.textPrimary }}>
              {theme === "light" ? "☾" : "☀️"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  leftContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoImage: {
    width: 100,
    height: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  actionButton: {
    padding: 4,
  },
  chatButton: {
    padding: 4,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF6B6B",
    borderRadius: 10,
    minWidth: 20,
    minHeight: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  themeToggle: {
    borderWidth: 1,
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default React.memo(ScreenHeader);
