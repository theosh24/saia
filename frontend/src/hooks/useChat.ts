import { useMutation } from "@tanstack/react-query";
import { sendChat, type ChatResponse } from "@/services/api";

export function useSendChat() {
  return useMutation<
    ChatResponse,
    Error,
    { agentId?: string; mint?: string; message: string; sessionId: string }
  >({
    mutationFn: sendChat,
  });
}
