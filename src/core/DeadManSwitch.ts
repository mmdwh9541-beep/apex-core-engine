import { EventEmitter } from "events";
import { KillSwitch } from "./KillSwitch";

export interface DeadManConfig {
  timeoutMs: number;       // المهلة القصوى قبل إعلان موت الاتصال (مثلاً 5000ms)
  checkIntervalMs: number; // فحص نبض الحياة كل كم ملي ثانية
}

export class DeadManSwitch extends EventEmitter {
  private killSwitch: KillSwitch;
  private timeoutMs: number;
  private checkIntervalMs: number;
  private lastHeartbeat: number;
  private timer: NodeJS.Timeout | null = null;
  private running: boolean = false;

  constructor(killSwitch: KillSwitch, config: DeadManConfig) {
    super();
    this.killSwitch = killSwitch;
    this.timeoutMs = config.timeoutMs;
    this.checkIntervalMs = config.checkIntervalMs;
    this.lastHeartbeat = Date.now();
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastHeartbeat = Date.now();

    this.timer = setInterval(() => {
      this.evaluate();
    }, this.checkIntervalMs);
  }

  public heartbeat(): void {
    this.lastHeartbeat = Date.now();
  }

  private evaluate(): void {
    if (!this.running) return;

    const timeSinceLastBeat = Date.now() - this.lastHeartbeat;

    if (timeSinceLastBeat > this.timeoutMs) {
      this.emit("timeout", { timeSinceLastBeat });
      this.killSwitch.trigger(
        `[Dead-Man Switch] لا توجد استجابة أو نبض حياة منذ ${timeSinceLastBeat}ms!`
      );
      this.stop();
    }
  }

  public stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}