import WebSocket from "ws";
import { EventEmitter } from "events";

export interface IndigoMessage {
  event: string;
  [key: string]: any;
}

/**
 * Minimal Indigo client using the JSON WebSocket interface.
 * This is a very small wrapper intended as a starting point
 * for migrating from INDI to INDIGO.
 */
export class IndigoClient extends EventEmitter {
  private ws: WebSocket | null = null;
  constructor(private host: string = "localhost", private port: number = 7624) {
    super();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://${this.host}:${this.port}/ws`);
      this.ws = ws as any;
      ws.on("open", () => {
        this.emit("connected");
        resolve();
      });
      ws.on("message", (data: any) => {
        this.handleMessage(data.toString());
      });
      ws.on("error", (err: any) => {
        this.emit("error", err);
        if (ws.readyState !== WebSocket.OPEN) reject(err);
      });
      ws.on("close", () => {
        this.emit("disconnected");
      });
    });
  }

  private handleMessage(raw: string) {
    try {
      const msg: IndigoMessage = JSON.parse(raw);
      this.emit("message", msg);
    } catch (err: any) {
      this.emit("error", err);
    }
  }

  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ws) return resolve();
      const ws: any = this.ws;
      ws.once("close", () => resolve());
      ws.close();
    });
  }
}
