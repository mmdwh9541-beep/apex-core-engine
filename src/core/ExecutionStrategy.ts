import { EventEmitter } from "events";
import { TelegramNotifier } from "./TelegramNotifier";

export interface TradeSignal {
  symbol: string;
  action: "BUY" | "SELL";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  timestamp: Date;
}

export class ExecutionStrategy extends EventEmitter {
  private notifier: TelegramNotifier | null = null;

  constructor(notifier?: TelegramNotifier) {
    super();
    if (notifier) {
      this.notifier = notifier;
    }
  }

  public onMarketTrade(symbol: string, price: number, qty: number, isBuyerMaker: boolean): void {
    const side = isBuyerMaker ? "SELL" : "BUY";
    // جاهز لمعالجة التدفق اللحظي
  }
}

export default ExecutionStrategy;
