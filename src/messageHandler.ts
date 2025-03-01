import { existsSync, mkdirSync, rmdirSync, writeFileSync } from "node:fs";
import type { GomuksMessage, RoomObject } from "./types";
import { styleText } from "node:util";
import { gomuksWs } from "./mcpServer";

const rooms: {
  room_id: string;
  name: string;
  network: string; // facebook, whatsapp, etc...
  roomObject: RoomObject;
  sorting_timestamp: number;
}[] = [];

export const getRooms = () => {
  return rooms.sort((a, b) => b.sorting_timestamp - a.sorting_timestamp);
};

const mkdirp = (path: string) => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
};

const DEBUG_WITH_FILES_AND_LOGS = false as boolean;

let i = 0;
let SHOULD_SAVE_MESSAGES = false;
export function handleMessage(data: Buffer | ArrayBuffer | Buffer[]): void {
  // Parse the message
  const message = JSON.parse(data.toString()) as GomuksMessage;

  if (DEBUG_WITH_FILES_AND_LOGS) {
    if (SHOULD_SAVE_MESSAGES) {
      mkdirp("./messages");
      // save message to file
      writeFileSync(
        `./messages/${i}-${message.command}.json`,
        JSON.stringify(message, null, 2)
      );
      i++;
    }
  }

  // Handle specific commands
  if (message.command === "sync_complete") {
    handleSyncComplete(message);
  }
  if (message.command === "init_complete") {
    if (DEBUG_WITH_FILES_AND_LOGS) {
      if (existsSync("./messages")) {
        rmdirSync("./messages", { recursive: true });
      }
      if (existsSync("./rooms")) {
        rmdirSync("./rooms", { recursive: true });
      }
      mkdirp("./rooms");

      const latestRooms = rooms
        .sort((a, b) => b.sorting_timestamp - a.sorting_timestamp)
        .slice(0, 10);
      for (const room of latestRooms) {
        writeFileSync(
          `./rooms/${room.sorting_timestamp}${room.name
            .replace(/ /g, "_")
            .replaceAll("/", "_")}.json`,
          JSON.stringify(room.roomObject, null, 2)
        );

        const unreadMessages = room.roomObject.meta.unread_messages;
        const hasUnreadMessages = unreadMessages > 0;

        console.log(
          styleText(
            hasUnreadMessages ? "green" : "gray",
            `${room.name} (${room.network}) ${unreadMessages}`
          )
        );
      }

      // log all the unique creators
      const creators = new Set<string>();
      for (const room of latestRooms) {
        creators.add(room.network);
      }
      // console.log(creators);

      getFromOne();
      SHOULD_SAVE_MESSAGES = true;
    }
  }
}

const getFromOne = async () => {
  const roomId = "!OJolbT2KjrCuxr1wMKHD:beeper.local";

  // gomuksWs.send(
  //   JSON.stringify({
  //     command: "get_room_state",
  //     request_id: 1,
  //     data: {
  //       room_id: roomId,
  //       include_members: false,
  //       fetch_members: false,
  //       refetch: false,
  //     },
  //   })
  // );

  gomuksWs.send(
    JSON.stringify({
      command: "paginate",
      request_id: 2,
      data: { room_id: roomId, max_timeline_id: 0, limit: 50 },
    })
  );
};

function handleSyncComplete(message: GomuksMessage): void {
  if (message.data.rooms) {
    const roomsRecord = message.data.rooms as Record<string, RoomObject>;
    const roomsArray = Object.values(roomsRecord);

    for (const room of roomsArray) {
      const network =
        room.meta.creation_content?.creator
          ?.split("_")[0]
          .split("gobot")[0]
          .split("bot")[0]
          .split("go")[0]
          .replace("@", "") || "unknown";

      const hasLowPriorityTag =
        room.account_data?.["m.tag"]?.content?.tags?.["m.lowpriority"];
      if (hasLowPriorityTag) {
        continue;
      }
      rooms.push({
        room_id: room.meta.room_id,
        name: room.meta.name,
        sorting_timestamp: room.meta.sorting_timestamp,
        network,
        roomObject: room,
      });
    }
  } else {
  }
}
