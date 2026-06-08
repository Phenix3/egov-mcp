import { Message } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ChatResponse {
  reply: string;
  tool_calls?: Array<{
    tool: string;
    arguments: any;
    result: any;
    latency_ms: number;
    status: 'ok' | 'error';
  }>;
  structured?: {
    type: string;
    data: any;
  };
}

export async function sendChatMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  lang: 'fr' | 'en'
): Promise<ChatResponse> {
  const url = `${API_BASE_URL}/chat`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        messages,
        lang,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP Error ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorMessage;
      } catch (e) {
        // Not JSON
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data as ChatResponse;
  } catch (error: any) {
    console.error('API call failed:', error);
    throw new Error(error.message || 'Impossible de se connecter au serveur backend.');
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  const url = `${API_BASE_URL}/health`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}
