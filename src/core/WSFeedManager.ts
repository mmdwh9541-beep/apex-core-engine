import { EventEmitter } from "events";
import WebSocket from "ws";

export interface WSFeedConfig {
  name: string;
  url: string;
}

export class WSFeedManager extends EventEmitter {
  private config: WSFeedConfig;
  private ws: WebSocket | null = null;
  private lastLatency: number = 0;

  constructor(config: WSFeedConfig) {
    super();
    this.config = config;
  }

  public connect(): void {
    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.on("open", () => {
        this.emit("connected", { venue: this.config.name });
      });

      this.ws.on("message", (raw: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(raw.toString());
          this.emit("message", parsed);
        } catch {
          // Ignore parse errors on raw pings
        }
      });

      this.ws.on("error", (err: Error) => {
        this.emit("error", err);
      });

      this.ws.on("close", () => {
        this.emit("disconnected", { venue: this.config.name });
        setTimeout(() => this.connect(), 2000);
      });
    } catch (e) {
      this.emit("error", e);
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }

  public getLatency(): number {
    return this.lastLatency;
  }
}