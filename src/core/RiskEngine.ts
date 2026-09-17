import { EventEmitter } from "events";
import { RiskConfig, AccountState } from "./types";

export class RiskEngine extends EventEmitter {
  private config: RiskConfig;

  constructor(config: RiskConfig) {
    super();
    this.config = config;
  }

  public evaluateDrawdown(state: AccountState): boolean {
    const drawdown = ((state.initialEquity - state.currentEquity) / state.initialEquity) * 100;
    if (drawdown >= this.config.maxDailyDrawdownPercent) {
      this.emit("alert", `Max drawdown hit: ${drawdown.toFixed(2)}%`);
      return false;
    }
    return true;
  }

  public evaluateLatency(latencyMs: number): boolean {
    if (latencyMs > this.config.maxLatencyMs) {
      this.emit("alert", `High latency: ${latencyMs}ms`);
      return false;
    }
    return true;
  }

  public isForexWeekendWindow(): boolean {
    const now = new Date();
    const day = now.getUTCDay();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();

    if (day === 5) {
      return hours > this.config.forexFlushHourUTC || 
        (hours === this.config.forexFlushHourUTC && minutes >= this.config.forexFlushMinuteUTC);
    }
    if (day === 6) return true;
    if (day === 0) return hours < this.config.forexResumeHourUTC;

    return false;
  }
}