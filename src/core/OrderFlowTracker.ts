import { EventEmitter } from "events";

export interface TradeTick {
  price: number;
  qty: number;
  isBuyerMaker: boolean; // true = Market Sell (ضرب البيد), false = Market Buy (ضرب الآسك)
  timestamp: number;
}

export interface FlowMetrics {
  cvd: number;               // دلتا الحجم التراكمي اللحظي
  buyVolume: number;         // إجمالي حجم الشراء الماركت
  sellVolume: number;        // إجمالي حجم البيع الماركت
  imbalanceRatio: number;    // نسبة اختلال التوازن بين الطرفين
  lastPrice: number;
}

export class OrderFlowTracker extends EventEmitter {
  private buyVolume: number = 0;
  private sellVolume: number = 0;
  private cvd: number = 0;
  private whaleThresholdUsd: number;
  private windowTicks: TradeTick[] = [];
  private maxWindowSize: number;

  constructor(whaleThresholdUsd: number = 50000, maxWindowSize: number = 200) {
    super();
    this.whaleThresholdUsd = whaleThresholdUsd;
    this.maxWindowSize = maxWindowSize;
  }

  public processTick(tick: TradeTick): void {
    const tradeValueUsd = tick.price * tick.qty;

    // فصل حجم الشراء العنيف عن البيع العنيف
    if (tick.isBuyerMaker) {
      // البائع نفّذ ماركت واستهلك أمر الشراء السلبي (Market Sell)
      this.sellVolume += tick.qty;
      this.cvd -= tick.qty;
    } else {
      // المشتري نفّذ ماركت واستهلك أمر البيع السلبي (Market Buy)
      this.buyVolume += tick.qty;
      this.cvd += tick.qty;
    }

    this.windowTicks.push(tick);
    if (this.windowTicks.length > this.maxWindowSize) {
      this.windowTicks.shift();
    }

    // رصد صفقات الحيتان اللحظية
    if (tradeValueUsd >= this.whaleThresholdUsd) {
      this.emit("whaleTrade", {
        side: tick.isBuyerMaker ? "SELL" : "BUY",
        valueUsd: tradeValueUsd,
        price: tick.price,
        qty: tick.qty,
        timestamp: tick.timestamp,
      });
    }

    // حساب نسبة اختلال التوازن (Imbalance)
    const totalVolume = this.buyVolume + this.sellVolume;
    const imbalanceRatio = totalVolume > 0 ? (this.buyVolume - this.sellVolume) / totalVolume : 0;

    this.emit("metrics", {
      cvd: this.cvd,
      buyVolume: this.buyVolume,
      sellVolume: this.sellVolume,
      imbalanceRatio,
      lastPrice: tick.price,
    } as FlowMetrics);
  }

  public resetWindow(): void {
    this.buyVolume = 0;
    this.sellVolume = 0;
    this.cvd = 0;
    this.windowTicks = [];
  }
}