import { Message, ToolCall, StructuredData } from "./types";

export interface ChatResponse {
  reply: string;
  tool_calls?: ToolCall[];
  structured?: StructuredData;
  thinking?: string;
}

export async function sendChatMessage(
  history: Message[],
  lang: "fr" | "en",
  showThinking: boolean = false
): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: history, lang, show_thinking: showThinking }),
  });

  if (!response.ok) {
    throw new Error("Erreur de communication avec le serveur");
  }

  return response.json();
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch("/api/health");
    return response.ok;
  } catch {
    return false;
  }
}