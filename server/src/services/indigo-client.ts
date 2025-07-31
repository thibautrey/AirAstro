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
      this.ws = new WebSocket(`ws://${this.host}:${this.port}/ws`);
      this.ws.on("open", () => {
        this.emit("connected");
        resolve();
      });
      this.ws.on("message", (data) => {
        this.handleMessage(data.toString());
      });
      this.ws.on("error", (err) => {
        this.emit("error", err);
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) reject(err);
      });
      this.ws.on("close", () => {
        this.emit("disconnected");
      });
    });
  }

  private handleMessage(raw: string) {
    try {
      const msg: IndigoMessage = JSON.parse(raw);
      this.emit("message", msg);
    } catch (err) {
      this.emit("error", err);
    }
  }

  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ws) return resolve();
      this.ws.once("close", () => resolve());
      this.ws.close();
    });
  }
}
