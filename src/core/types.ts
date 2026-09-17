export interface RiskConfig {
  maxDailyDrawdownPercent: number;
  maxLatencyMs: number;
  forexFlushHourUTC: number;
  forexFlushMinuteUTC: number;
  forexResumeHourUTC: number;
}

export interface AccountState {
  initialEquity: number;
  currentEquity: number;
  openPositionsCount: number;
  lastLatencyMs: number;
}

export interface TargetVenue {
  name: string;
  cancelAllOrders: () => Promise<void>;
  closeAllPositions: () => Promise<void>;
}