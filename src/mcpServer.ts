import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getRooms } from "./messageHandler";
import { z } from "zod";
import { connectToGomuks } from "./gomuksWebSocket";
import type { GomuksMessage } from "./types";

export const gomuksWs = await connectToGomuks();

export const mcpServer = new McpServer({
  name: "mcp-matrix",
  version: "0.0.1",
});

// Add a tool to search chats by name
mcpServer.tool(
  "messages_list_chats",
  "List all chats from all networks with pagination",
  {
    limit: z.number().max(100).optional().default(25),
    paginationIndex: z.number().optional().default(0),
  },
  async ({ limit, paginationIndex }) => {
    const startIndex = paginationIndex * limit;
    const endIndex = startIndex + limit;
    const roomsToReturn = getRooms()
      .slice(startIndex, endIndex)
      .map((room) => ({
        roomId: room.room_id,
        chatName: room.name,
        network: room.network,
        unreadMessages: room.roomObject.meta.unread_messages,
      }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(roomsToReturn, null, 2),
        },
      ],
    };
  }
);

mcpServer.tool(
  "messages_get_chat_recent_messages",
  "Get the recent messages from a chat",
  {
    roomId: z.string(),
    limit: z.number().max(100).optional().default(25),
    paginationIndex: z.number().optional().default(0),
  },
  async ({ roomId, limit }) => {
    const messages: {
      sender: string;
      timestamp: number;
      body: string;
    }[] = [];

    function handleMessage(data: Buffer | ArrayBuffer | Buffer[]): void {
      // Parse the message
      const message = JSON.parse(data.toString()) as GomuksMessage;
      if (message.command === "response") {
        type RoomEvent = {
          room_id: string;
          event_id: string;
          sender: string;
          timestamp: number;
          decrypted?: {
            body: string;
          };
        };
        const events = message.data?.events as RoomEvent[];
        if (!events) {
          return;
        }
        for (const _event of events) {
          const event = _event as RoomEvent;
          if (event.room_id !== roomId) {
            continue;
          }
          if (!event.decrypted) {
            continue;
          }
          messages.push({
            sender: event.sender,
            timestamp: event.timestamp,
            body: event.decrypted.body,
          });
        }
      }
    }

    gomuksWs.on("message", handleMessage);

    gomuksWs.send(
      JSON.stringify({
        command: "paginate",
        request_id: 1,
        data: { room_id: roomId, max_timeline_id: 0, limit: 50 },
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const sortedMessages = messages
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, limit);

    return {
      content: [
        { type: "text", text: JSON.stringify(sortedMessages, null, 2) },
      ],
    };
  }
);
