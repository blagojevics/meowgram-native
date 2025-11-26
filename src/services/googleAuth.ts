import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

// Configure your Google OAuth2 credentials from environment variables
export const googleConfig = {
  clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
  scopes: ["profile", "email"],
};

console.log("Google Auth Config:", {
  hasWebClientId: !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  hasAndroidClientId: !!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  hasExpoClientId: !!process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
  expoClientId:
    process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID?.substring(0, 20) + "...",
});

export const signInWithGoogleAsync = async (promptAsync: any) => {
  try {
    if (!promptAsync) {
      throw new Error("Google auth not initialized. Please try again.");
    }

    console.log("Calling promptAsync for Google authentication...");
    const result = await promptAsync();

    console.log("Google auth result type:", result?.type);

    if (result?.type === "success") {
      console.log("Google authentication successful");
      const { id_token } = result.params;
      return { idToken: id_token };
    } else if (result?.type === "error") {
      console.error("Google auth error:", result.error);
      throw new Error(
        `Google auth failed: ${result.error?.message || "Unknown error"}`
      );
    } else {
      throw new Error("Google sign-in was cancelled or failed");
    }
  } catch (error: any) {
    console.error("Google sign-in error:", error.message || error);
    throw error;
  }
};

export default {
  signInWithGoogleAsync,
};
