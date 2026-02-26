import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ request, platform }) => {
  const chatRoomStub = platform?.env?.DB as unknown as ChatRoomStubAPI;
  if (!chatRoomStub) {
    throw new Error("Error: chatroom not available");
  }
  const ip = request.headers.get("cf-connecting-ip") ?? "default";
  const savedMessages = await chatRoomStub.getMessages(ip);
  return { ip, savedMessages };
};

export const actions = {
  saveMessages: async ({ request, platform }) => {
    const formData = await request.formData();
    const messages = formData.get("messages");
    const ip = formData.get("ip") as string;
    if (!messages || !ip) {
      throw new Error("Error: invalid request");
    }
    const parsedMessages = JSON.parse(messages.toString()) as UI_BULK_MESSAGE;
    const chatRoomStub = platform?.env?.DB as unknown as ChatRoomStubAPI;
    if (!chatRoomStub) {
      throw new Error("Error: chatroom not available");
    }
    for (const message of parsedMessages) {
      await chatRoomStub.saveMessage(ip, message);
    }
    return { success: true };
  },
  deleteHistory: async ({ request, platform }) => {
    const chatRoomStub = platform?.env?.DB as unknown as ChatRoomStubAPI;
    if (!chatRoomStub) {
      throw new Error("Error: chatroom not available");
    }
    const formData = await request.formData();
    const ip = formData.get("ip") as string;
    if (!ip) {
      throw new Error("Error: invalid request");
    }
    await chatRoomStub.clearMessages(ip);
    return { success: true };
  },
} satisfies Actions;
