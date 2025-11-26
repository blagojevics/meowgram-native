import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { googleConfig } from "../services/googleAuth";

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const { width, height } = Dimensions.get("window");
const isMobile = width < 600;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, googleSignIn } = useAuth();
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
    scopes: ["profile", "email"],
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    console.log("Login button pressed with:", email, password);
    setError(null);
    setIsLoading(true);
    try {
      console.log("Calling login function...");
      await login(email, password);
      console.log("Login successful!");
      // Navigation will be handled automatically by AppNavigator
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Login failed");
      Alert.alert("Login error", err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!promptAsync) {
      Alert.alert(
        "Error",
        "Google authentication is not initialized yet. Please try again."
      );
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      console.log("Starting Google sign-in flow...");
      const result = await promptAsync();
      console.log("Google prompt result:", result?.type);

      if (result?.type === "success") {
        console.log("Google auth successful, now signing in with Firebase...");
        await googleSignIn(promptAsync);
      } else if (result?.type === "error") {
        const errorMsg = result.error?.message || "Unknown error";
        setError(`Google sign-in failed: ${errorMsg}`);
        Alert.alert("Google Sign-In Error", errorMsg);
      } else {
        setError("Google sign-in was cancelled");
        Alert.alert("Cancelled", "Google sign-in was cancelled");
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      setError(err.message || "Google login failed");
      Alert.alert("Google sign-in error", err.message || "Google login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ImageBackground
        source={{
          uri: "https://img.freepik.com/free-photo/old-cement-wall-texture_1149-1280.jpg?semt=ais_hybrid&w=740&q=80",
        }}
        style={styles.background}
        resizeMode="cover"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.overlay}>
            <View style={styles.card}>
              <View style={styles.left}>
                <Text style={styles.leftTitle}>Welcome to Meowgram</Text>
                <Text style={styles.leftText}>
                  Log In and connect with your favourite animals.
                </Text>
                <Text style={styles.leftSpan}>
                  Don't have an account? Register now!
                </Text>
                <Pressable
                  style={styles.registerButton}
                  onPress={() => navigation.navigate("Register")}
                >
                  <Text style={styles.buttonText}>Register!</Text>
                </Pressable>
              </View>
              <View style={styles.right}>
                <Text style={styles.rightTitle}>Login</Text>
                <View style={styles.form}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                  {error && <Text style={styles.error}>{error}</Text>}
                  <Pressable
                    style={[
                      styles.loginButton,
                      isLoading && styles.disabledButton,
                    ]}
                    onPress={handleLogin}
                    disabled={isLoading}
                    accessibilityLabel="Login button"
                  >
                    {isLoading ? (
                      <ActivityIndicator color="black" />
                    ) : (
                      <Text style={styles.buttonText}>Login!</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={[
                      styles.googleButton,
                      isLoading && styles.disabledButton,
                    ]}
                    onPress={handleGoogle}
                    disabled={isLoading}
                    accessibilityLabel="Continue with Google"
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#4285F4" />
                    ) : (
                      <View style={styles.googleInner}>
                        <FontAwesome name="google" size={18} color="#4285F4" />
                        <Text style={[styles.buttonText, { marginLeft: 10 }]}>
                          Continue with Google
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(187, 186, 194, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    flexDirection: isMobile ? "column" : "row",
    backgroundColor: "white",
    borderRadius: 20,
    width: isMobile ? "90%" : "50%",
    height: isMobile ? 500 : 600,
    overflow: "hidden",
  },
  left: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(204, 204, 204, 0.7)", // Simplified background
  },
  leftTitle: {
    fontSize: isMobile ? 24 : 40,
    fontWeight: "bold",
    marginBottom: 10,
    color: "black",
  },
  leftText: {
    fontSize: isMobile ? 16 : 22,
    textAlign: "center",
    marginBottom: 20,
    color: "black",
  },
  leftSpan: {
    fontSize: isMobile ? 14 : 18,
    marginBottom: 20,
    textAlign: "center",
    color: "black",
  },
  registerButton: {
    backgroundColor: "rgba(171, 171, 171, 1)",
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(104, 85, 224, 1)",
  },
  buttonText: {
    color: "black",
    fontWeight: "600",
    textAlign: "center",
  },
  right: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  rightTitle: {
    fontSize: isMobile ? 20 : 40,
    fontWeight: "bold",
    marginBottom: 20,
  },
  form: {
    width: "100%",
    alignItems: "center",
  },
  input: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "lightgray",
    fontSize: 16,
    marginBottom: 20,
    paddingVertical: 10,
    color: "#000",
    backgroundColor: "transparent",
  },
  error: {
    color: "red",
    marginBottom: 20,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderRadius: 4,
    paddingVertical: 10,
    width: 200,
    borderWidth: 1,
    borderColor: "rgba(104, 85, 224, 1)",
    marginBottom: 10,
  },
  googleButton: {
    backgroundColor: "#fff",
    borderRadius: 4,
    paddingVertical: 10,
    width: 200,
    borderWidth: 1,
    borderColor: "#4285F4",
    marginBottom: 10,
  },
  googleInner: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default LoginScreen;
