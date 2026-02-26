type UI_MESSAGE = {
  id: string;
  timestamp: Date;
} & SINGLE_MESSAGE;

type UI_BULK_MESSAGE = Array<UI_MESSAGE>;

type SINGLE_MESSAGE = {
  content: string | null;
  role: "system" | "developer" | "user" | "assistant" | "tool";
};
type BULK_MESSAGE = Array<SINGLE_MESSAGE>;

type StreamData = ChunkData | ChatCompletionChunk | DoneMessage;

interface ChunkData {
  id: string;
  type: "text";
  score: number;
  text: string;
  item: {
    key: string;
    timestamp: number | null;
    metadata: {
      updated_on: string;
    };
  };
  scoring_details: {
    vector_score: number;
    vector_rank: number;
    reranking_score: number;
  };
}

interface ChatCompletionChunk {
  id: string;
  created: number;
  model: string;
  object: "chat.completion.chunk";
  choices: Array<{
    index: number;
    delta: {
      content: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface DoneMessage {
  data: "[DONE]";
}

type ChatRoomStubAPI = {
  getMessages(roomId: string): Promise<UI_BULK_MESSAGE>;
  saveMessage(roomId: string, message: UI_MESSAGE): Promise<boolean>;
  clearMessages(roomId: string): Promise<void>;
  deleteMessage(roomId: string, messageId: string): Promise<void>;
};
