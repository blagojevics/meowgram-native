import { useNavigation } from "@react-navigation/native";
import { useChat } from "../contexts/ChatContext";
import { useCallback } from "react";
import { Conversation } from "../@types/chat";

/**
 * Hook for navigating to chat screens
 */
export const useChatNavigation = () => {
  const navigation = useNavigation<any>();
  const { selectConversation, startConversation } = useChat();

  const goToConversationList = useCallback(() => {
    navigation.navigate("ConversationList");
  }, [navigation]);

  const goToChat = useCallback(
    async (conversation: Conversation) => {
      await selectConversation(conversation);
      navigation.navigate("ChatDetail", { conversationId: conversation.id });
    },
    [navigation, selectConversation]
  );

  const startNewChat = useCallback(
    async (userId: string) => {
      try {
        const conversation = await startConversation(userId);
        await selectConversation(conversation);
        navigation.navigate("ChatDetail", { conversationId: conversation.id });
      } catch (error) {
        console.error("Error starting conversation:", error);
        alert("Failed to start conversation");
      }
    },
    [navigation, selectConversation, startConversation]
  );

  return {
    goToConversationList,
    goToChat,
    startNewChat,
  };
};
