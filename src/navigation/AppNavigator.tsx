import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BackHandler } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { View, ActivityIndicator, Platform } from "react-native";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type {
  BottomTabNavigationEventMap,
  BottomTabNavigationProp,
} from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import { db } from "../config/firebase";

// Screen imports
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AddPostScreen from "../screens/AddPostScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PostDetailScreen from "../screens/PostDetailScreen";
import CropImageScreen from "../screens/CropImageScreen";
import ConversationListScreen from "../screens/ConversationListScreen";
import ChatDetailScreen from "../screens/ChatDetailScreen";
import SearchUsersScreen from "../screens/SearchUsersScreen";
import ConversationInfoScreen from "../screens/ConversationInfoScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  UserProfile: { userId: string };
  AddPost: { selectedImage?: string };
  Settings: undefined;
  PostDetail: { postId: string };
  CropImage: { imageUri: string };
  ConversationList: undefined;
  ChatDetail: { conversationId: string };
  SearchUsers: undefined;
  ConversationInfo: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: { userId?: string };
  Notifications: undefined;
  AddPost: { selectedImage?: string };
};

// Keep a module-scoped timestamp so it persists across re-renders
let lastHomeTabPress = 0;

const MainTabs: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  // Get unread notifications count
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });

    return () => unsub();
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.bgPrimary,
          borderTopColor: colors.borderColor,
          borderTopWidth: 1,
          // Use vertical padding to center content and avoid icons being too low
          // lowered a tiny bit for a tighter bottom spacing
          paddingVertical: Platform.OS === "ios" ? 6 : 4,
        },
        // Ensure each item is centered vertically
        tabBarItemStyle: {
          paddingTop: 1,
          paddingBottom: 1,
        },
        tabBarLabelStyle: {
          marginTop: 0,
          // tiny reduction so labels sit a touch lower visually
          marginBottom: Platform.OS === "ios" ? 1 : 0,
          fontSize: 12,
        },
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size * 0.6} color={color} />
          ),
        }}
        listeners={({ navigation, route }: { navigation: any; route: any }) => {
          return {
            tabPress: (e: any) => {
              const now = Date.now();
              if (now - lastHomeTabPress < 300) {
                // double press detected - navigate to Home with scrollToTop param
                navigation.navigate("Home", { scrollToTop: now });
              }
              lastHomeTabPress = now;
            },
          };
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size * 0.6} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size * 0.6} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: "Notifications",
          tabBarBadge:
            unreadCount > 0
              ? unreadCount > 99
                ? "99+"
                : unreadCount.toString()
              : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size * 0.6} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AddPost"
        component={AddPostScreen}
        options={{
          tabBarLabel: "Add",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size * 0.8} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const AppNavigatorContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  // Logging removed to reduce console spam

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bgPrimary,
        }}
      >
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        // Authenticated user - show main tabs
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="UserProfile"
            component={ProfileScreen}
            options={{
              gestureEnabled: true,
            }}
          />
          <Stack.Screen name="AddPost" component={AddPostScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} />
          <Stack.Screen name="CropImage" component={CropImageScreen} />
          <Stack.Screen
            name="ConversationList"
            component={ConversationListScreen}
            options={{ gestureEnabled: true }}
          />
          <Stack.Screen
            name="ChatDetail"
            component={ChatDetailScreen}
            options={{ gestureEnabled: true }}
          />
          <Stack.Screen
            name="SearchUsers"
            component={SearchUsersScreen}
            options={{ gestureEnabled: true }}
          />
          <Stack.Screen
            name="ConversationInfo"
            component={ConversationInfoScreen}
            options={{ gestureEnabled: true }}
          />
        </Stack.Navigator>
      ) : (
        // Unauthenticated user - show auth screens
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

const AppNavigator: React.FC = () => {
  return <AppNavigatorContent />;
};

export default AppNavigator;
