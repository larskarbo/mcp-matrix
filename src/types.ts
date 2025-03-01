// Define types for the messages
export interface GomuksMessage {
  command: "sync_complete" | string;
  request_id: number;
  data: {
    [key: string]: unknown;
  };
}

// Room object type definition
export type RoomObject = {
  meta: {
    room_id: string;
    name: string;
    creation_content?: {
      creator?: string;
      room_version: string;
    };
    sorting_timestamp: number;
    unread_messages: number;
  };
  events: unknown[];
  account_data: {
    "m.tag"?: {
      content: {
        tags: {
          "m.lowpriority"?: {
            order: string;
          };
        };
      };
    };
  };
};

// Global state type
export interface GlobalState {
  messages: GomuksMessage[];
  messagesByCommand: Record<string, GomuksMessage[]>;
  latestByCommand: Record<string, GomuksMessage>;
  rooms?: Record<string, RoomObject>;
}
