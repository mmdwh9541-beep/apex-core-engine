import { EventEmitter } from "events";

export interface LiquidationEvent {
  symbol: string;
  side: "SELL" | "BUY"; // SELL = تصفية عقود لونغ (Long Liquidation)، BUY = تصفية عقود شورت (Short Liquidation)
  price: number;
  qty: number;
  valueUsd: number;
  timestamp: number;
}

export interface CascadeAlert {
  symbol: string;
  side: "LONG_CASCADE" | "SHORT_CASCADE";
  totalValueUsd: number;
  eventCount: number;
  windowMs: number;
}

export class LiquidationTracker extends EventEmitter {
  private eventsWindow: LiquidationEvent[] = [];
  private windowDurationMs: number;
  private cascadeThresholdUsd: number;
  private minEventCount: number;

  constructor(
    windowDurationMs: number = 3000,      // نافذة التجميع الزمني (3 ثوانٍ)
    cascadeThresholdUsd: number = 100000, // حد انفجار الشلال الإجمالي (100 ألف دولار)
    minEventCount: number = 3             // الحد الأدنى لعدد عمليات التصفية المتتالية
  ) {
    super();
    this.windowDurationMs = windowDurationMs;
    this.cascadeThresholdUsd = cascadeThresholdUsd;
    this.minEventCount = minEventCount;
  }

  public processLiquidation(rawMsg: any): void {
    if (rawMsg.e !== "forceOrder") return;

    const o = rawMsg.o;
    const price = parseFloat(o.p);
    const qty = parseFloat(o.q);
    const valueUsd = price * qty;
    const side: "SELL" | "BUY" = o.S; // S = SELL تعني تصفية شراء إجبارية

    const event: LiquidationEvent = {
      symbol: o.s,
      side,
      price,
      qty,
      valueUsd,
      timestamp: rawMsg.E,
    };

    this.emit("liquidation", event);

    // إضافة الحدث للنافذة الزمنية
    const now = Date.now();
    this.eventsWindow.push(event);

    // تنظيف الأحداث التي مر عليها أكثر من النافذة المحددة
    this.eventsWindow = this.eventsWindow.filter(
      (e) => now - e.timestamp <= this.windowDurationMs
    );

    this.detectCascade();
  }

  private detectCascade(): void {
    let longLiqUsd = 0;
    let longCount = 0;
    let shortLiqUsd = 0;
    let shortCount = 0;

    for (const ev of this.eventsWindow) {
      if (ev.side === "SELL") {
        longLiqUsd += ev.valueUsd;
        longCount++;
      } else {
        shortLiqUsd += ev.valueUsd;
        shortCount++;
      }
    }

    // رصد شلال تصفيات الشراء (انفجار هبوطي إجباري)
    if (longLiqUsd >= this.cascadeThresholdUsd && longCount >= this.minEventCount) {
      this.emit("cascade", {
        symbol: "BTCUSDT",
        side: "LONG_CASCADE",
        totalValueUsd: longLiqUsd,
        eventCount: longCount,
        windowMs: this.windowDurationMs,
      } as CascadeAlert);
      this.eventsWindow = []; // تفريغ النافذة بعد إطلاق التنبيه لمنع التكرار
    }

    // رصد شلال تصفيات البيع (انفجار صعودي إجباري / Short Squeeze)
    if (shortLiqUsd >= this.cascadeThresholdUsd && shortCount >= this.minEventCount) {
      this.emit("cascade", {
        symbol: "BTCUSDT",
        side: "SHORT_CASCADE",
        totalValueUsd: shortLiqUsd,
        eventCount: shortCount,
        windowMs: this.windowDurationMs,
      } as CascadeAlert);
      this.eventsWindow = [];
    }
  }
}