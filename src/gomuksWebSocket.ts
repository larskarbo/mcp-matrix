import WebSocket from "ws";
import { handleMessage } from "./messageHandler";

export async function connectToGomuks(): Promise<WebSocket> {
  const url = "ws://localhost:29325/_gomuks/websocket";

  const authCookie = process.env.GOMUKS_AUTH_COOKIE;
  if (!authCookie) {
    throw new Error("GOMUKS_AUTH_COOKIE is not set");
  }

  const headers = {
    Cookie: authCookie.includes("gomuks_auth=")
      ? authCookie
      : `gomuks_auth=${authCookie}`,
  };

  const ws = new WebSocket(url, {
    headers: headers,
    origin: "http://localhost:29325",
  });

  ws.on("message", handleMessage);

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  return ws;
}
