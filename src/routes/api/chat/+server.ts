import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import type {
  Ai,
  AiSearchChatCompletionsRequest,
} from "@cloudflare/workers-types";

interface Env {
  AI: Ai<AiModels>;
  AI_SEARCH_ID: string;
}

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
} as const;

function isValidMessageArray(data: unknown): data is Array<UI_MESSAGE> {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every(
      (msg) =>
        typeof msg === "object" &&
        msg !== null &&
        "role" in msg &&
        "content" in msg &&
        typeof msg.role === "string" &&
        (msg.content === null || typeof msg.content === "string"),
    )
  );
}

function formatMessages(messages: Array<UI_MESSAGE>): BULK_MESSAGE {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content ?? "",
  }));
}

function validateEnvironment(env: unknown): env is Env {
  return (
    typeof env === "object" &&
    env !== null &&
    "AI" in env &&
    "AI_SEARCH_ID" in env &&
    typeof (env as Record<string, unknown>).AI_SEARCH_ID === "string"
  );
}

function handleError(error: unknown): Response {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return json({ error: "Request timeout" }, { status: 504 });
    }
    if (error instanceof SyntaxError) {
      return json({ error: "Invalid request body" }, { status: 400 });
    }
    console.error("Chat API error:", error.message);
  } else {
    console.error("Chat API error:", error);
  }
  return json({ error: "Internal server error" }, { status: 500 });
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    if (!platform?.env) {
      return json({ error: "Server configuration error" }, { status: 500 });
    }

    const env = platform.env as unknown;
    if (!validateEnvironment(env)) {
      return json({ error: "Server configuration error" }, { status: 500 });
    }

    const { AI, AI_SEARCH_ID } = env;

    let messages: unknown;
    try {
      messages = await request.json();
    } catch (parseError) {
      return json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!isValidMessageArray(messages)) {
      return json(
        {
          error: "Messages must be a non-empty array of valid message objects",
        },
        { status: 400 },
      );
    }

    const chatCompletionBody = {
      messages: formatMessages(messages),
      stream: true,
    } satisfies AiSearchChatCompletionsRequest;

    const aiSearch = AI.aiSearch().get(AI_SEARCH_ID);
    const response = (await aiSearch.chatCompletions(
      chatCompletionBody,
    )) as ReadableStream;

    if (!response) {
      return json({ error: "No response from AI service" }, { status: 502 });
    }

    return new Response(response, {
      headers: STREAM_HEADERS,
    });
  } catch (error) {
    return handleError(error);
  }
};
