<script lang="ts">
  import { Button, Input, ScrollArea } from "$lib";
  import { Send, LoaderCircle } from "lucide-svelte";
  import { marked } from "marked";
  import type { PageProps } from "./$types";

  const { data: propData } = $props() as PageProps;
  let messages = $state<UI_BULK_MESSAGE>(propData.savedMessages);
  let bufferMessages = $state<UI_BULK_MESSAGE>([]);
  let inputValue = $state("");
  let scrollViewportRef: HTMLElement | null = $state(null);
  let isThinking = $state(false);
  let thinkingMessageId = $state<string | null>(null);

  const canSend = $derived(inputValue.trim().length > 0 && !isThinking);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (scrollViewportRef) {
        scrollViewportRef.scrollTop = scrollViewportRef.scrollHeight;
      }
    });
  }

  $effect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    } else
      messages = [
        {
          id: generateMessageId(),
          content: `Hi there ${propData.ip || "guest"}! I'm your AI assistant. How can I help you today?`,
          role: "assistant",
          timestamp: new Date(),
        },
      ];
  });

  function generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function createUserMessage(content: string): UI_MESSAGE {
    return {
      id: generateMessageId(),
      content,
      role: "user",
      timestamp: new Date(),
    };
  }

  function createAssistantMessage(id: string): UI_MESSAGE {
    return {
      id,
      content: "",
      role: "assistant",
      timestamp: new Date(),
    };
  }

  function updateMessageContent(messageId: string, newContent: string): void {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex !== -1) {
      messages[messageIndex].content = newContent;
      messages = messages;
    }
  }

  function isValidChatCompletionChunk(
    data: unknown,
  ): data is ChatCompletionChunk {
    return (
      typeof data === "object" &&
      data !== null &&
      "object" in data &&
      (data as Record<string, unknown>).object === "chat.completion.chunk" &&
      "choices" in data &&
      Array.isArray((data as Record<string, unknown>).choices)
    );
  }

  async function processStreamResponse(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    assistantMessageId: string,
  ): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = "";
    let thinkingCleared = false;
    const messageIndex = messages.findIndex((m) => m.id === assistantMessageId);
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        buffer = lines[lines.length - 1] ?? "";

        if (!thinkingCleared && thinkingMessageId === assistantMessageId) {
          thinkingMessageId = null;
          thinkingCleared = true;
        }

        for (const line of lines.slice(0, -1)) {
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6).trim();
          if (data === "[DONE]") return;
          if (!data) continue;

          try {
            const parsed = JSON.parse(data) as StreamData;
            if (isValidChatCompletionChunk(parsed)) {
              const content = parsed.choices[0]?.delta?.content;
              if (parsed.choices[0]?.finish_reason) {
                console.debug("FINISHED", {
                  finish_reason: parsed.choices[0]?.finish_reason,
                  token_usage: parsed.usage,
                });
                if (messageIndex !== -1) {
                  bufferMessages.push(messages[messageIndex]);
                  const formData = new FormData();
                  formData.append("messages", JSON.stringify(bufferMessages));
                  formData.append("ip", propData.ip);
                  await fetch("?/saveMessages", {
                    method: "POST",
                    body: formData,
                  });
                }
              }
              if (content) {
                if (messageIndex !== -1) {
                  messages[messageIndex].content += content;
                  messages = messages;
                }
              }
            }
          } catch (parseError) {
            console.debug("Failed to parse stream chunk:", parseError);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async function sendMessage() {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    const userMessage = createUserMessage(trimmedInput);
    const assistantMessageId = generateMessageId();
    const assistantMessage = createAssistantMessage(assistantMessageId);

    bufferMessages = [userMessage];
    messages = [...messages, userMessage, assistantMessage];
    inputValue = "";
    isThinking = true;
    thinkingMessageId = assistantMessageId;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const body = response.body;
      if (!body) {
        throw new Error("No response body");
      }

      const reader = body.getReader();
      await processStreamResponse(reader, assistantMessageId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      updateMessageContent(
        assistantMessageId,
        `Sorry, there was an error processing your message: ${errorMessage}`,
      );
      console.error("Chat error:", error);
    } finally {
      isThinking = false;
      thinkingMessageId = null;
    }
  }

  function handleInputKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function deleteHistory() {
    messages = [];
    const formData = new FormData();
    formData.append("ip", propData.ip);
    await fetch("?/deleteHistory", {
      method: "POST",
      body: formData,
    });
  }
</script>

<div class="flex h-dvh flex-col bg-slate-950 text-slate-50">
  <!-- Header -->
  <header
    class="border-b border-slate-800 bg-slate-900 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between"
  >
    <div>
      <h1 class="text-lg sm:text-2xl font-bold">Chat Assistant</h1>
      <p class="text-xs sm:text-sm text-slate-400">
        Professional chat interface
      </p>
    </div>
    <Button
      onclick={deleteHistory}
      variant="outline"
      size="sm"
      class="text-xs sm:text-sm"
      aria-label="Delete chat history"
    >
      Delete History
    </Button>
  </header>

  <!-- Messages Container -->
  <ScrollArea
    class="flex-1 overflow-y-hidden"
    bind:viewportRef={scrollViewportRef}
  >
    <div
      class="space-y-3 p-4 sm:space-y-4 sm:p-6"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {#if messages.length === 0}
        <div class="flex h-full items-center justify-center px-4">
          <div class="text-center">
            <div class="mb-4 text-4xl sm:text-5xl" aria-hidden="true">💬</div>
            <h2 class="mb-2 text-lg sm:text-xl font-semibold text-slate-200">
              Start a conversation
            </h2>
            <p class="text-sm sm:text-base text-slate-400">
              Type a message below to begin
            </p>
          </div>
        </div>
      {:else}
        {#each messages as message (message.id)}
          <article
            class="flex gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            class:justify-end={message.role === "user"}
            aria-label={message.role === "user"
              ? "Your message"
              : "Assistant message"}
          >
            {#if message.role === "assistant"}
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600"
                aria-label="Assistant avatar"
              >
                <span class="text-xs font-bold">AI</span>
              </div>
            {/if}

            <div
              class="max-w-xs sm:max-w-2xl rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm"
              class:bg-blue-600={message.role === "user"}
              class:bg-slate-800={message.role === "assistant"}
              class:text-slate-50={message.role === "user"}
              class:text-slate-100={message.role === "assistant"}
            >
              {#if message.role === "assistant"}
                {#if thinkingMessageId === message.id}
                  <div class="flex items-center gap-2">
                    <LoaderCircle
                      class="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    <span class="text-slate-400">Thinking...</span>
                  </div>
                {:else}
                  <div class="prose prose-invert max-w-none text-sm">
                    {@html marked(message.content || "")}
                  </div>
                {/if}
              {:else}
                <p>{message.content}</p>
              {/if}
            </div>

            {#if message.role === "user"}
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700"
                aria-label="Your avatar"
              >
                <span class="text-xs font-bold">You</span>
              </div>
            {/if}
          </article>
        {/each}
      {/if}
    </div>
  </ScrollArea>

  <!-- Input Area -->
  <footer
    class="border-t border-slate-800 bg-slate-900 p-4 sm:p-6 safe-area-inset-bottom"
  >
    <form
      class="flex gap-2 sm:gap-3"
      onsubmit={(e) => {
        e.preventDefault();
        sendMessage();
      }}
    >
      <Input
        value={inputValue}
        oninput={(e) => (inputValue = (e.target as HTMLInputElement).value)}
        onkeydown={handleInputKeydown}
        placeholder="Type your message..."
        aria-label="Message input"
        class="flex-1 border-slate-700 bg-slate-800 text-slate-50 text-sm placeholder:text-slate-500"
      />
      <Button
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        class="gap-2 bg-blue-600 hover:bg-blue-700 px-4 sm:px-5 text-xs sm:text-sm flex items-center whitespace-nowrap"
      >
        <Send class="h-4 w-4" aria-hidden="true" />
        <span class="hidden sm:inline">Send</span>
      </Button>
    </form>
  </footer>
</div>

<style>
  :global(html, body) {
    height: 100%;
    overflow: hidden;
  }

  :global(.prose) {
    color: inherit;
  }

  :global(.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6) {
    color: #f1f5f9;
    font-weight: 600;
    margin-top: 0.3em;
    margin-bottom: 0.3em;
  }

  :global(.prose h1) {
    font-size: 1.1em;
  }

  :global(.prose h2) {
    font-size: 1em;
  }

  :global(.prose h3, .prose h4, .prose h5, .prose h6) {
    font-size: 0.95em;
  }

  :global(.prose p) {
    margin: 0.3em 0;
    line-height: 1.4;
  }

  :global(.prose ul, .prose ol) {
    margin: 0.3em 0;
    padding-left: 1.25em;
  }

  :global(.prose li) {
    margin: 0.15em 0;
  }

  :global(.prose code) {
    background-color: #1e293b;
    color: #e2e8f0;
    padding: 0.15em 0.3em;
    border-radius: 0.25em;
    font-family: monospace;
    font-size: 0.85em;
  }

  :global(.prose pre) {
    background-color: #1e293b;
    color: #e2e8f0;
    padding: 0.75em;
    border-radius: 0.5em;
    overflow-x: auto;
    margin: 0.3em 0;
    font-size: 0.8em;
  }

  :global(.prose pre code) {
    background-color: transparent;
    color: inherit;
    padding: 0;
  }

  :global(.prose a) {
    color: #60a5fa;
    text-decoration: underline;
  }

  :global(.prose a:hover) {
    color: #93c5fd;
  }

  :global(.prose blockquote) {
    border-left: 3px solid #475569;
    padding-left: 0.75em;
    color: #cbd5e1;
    margin: 0.3em 0;
  }

  :global(.prose hr) {
    border-color: #475569;
    margin: 0.5em 0;
  }

  :global(.prose table) {
    border-collapse: collapse;
    width: 100%;
    margin: 0.3em 0;
    font-size: 0.85em;
  }

  :global(.prose th, .prose td) {
    border: 1px solid #475569;
    padding: 0.3em;
    text-align: left;
  }

  :global(.prose th) {
    background-color: #1e293b;
    color: #f1f5f9;
  }
</style>
