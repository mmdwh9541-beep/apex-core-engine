import axios from "axios";
import { Config } from "./Config";
import { TelegramNotifier } from "./TelegramNotifier";

export class ForexEngine {
  private notifier: TelegramNotifier;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly symbol: string = "EUR/USD";

  constructor(notifier: TelegramNotifier) {
    this.notifier = notifier;
  }

  public start(intervalMinutes: number = 5): void {
    if (!Config.forex?.twelveDataApiKey) {
      console.warn("⚠️ [ForexEngine]: TWELVE_DATA_API_KEY غير متوفر، لن يتم تفعيل فحص الفوركس.");
      return;
    }

    console.log(`📡 [ForexEngine]: تم بدء المراقبة لزوج ${this.symbol} كل ${intervalMinutes} دقائق.`);
    this.fetchPrice();

    this.intervalTimer = setInterval(() => {
      this.fetchPrice();
    }, intervalMinutes * 60 * 1000);
  }

  private async fetchPrice(): Promise<void> {
    try {
      const url = `https://api.twelvedata.com/price?symbol=${this.symbol}&apikey=${Config.forex.twelveDataApiKey}`;
      const response = await axios.get(url);

      if (response.data && response.data.price) {
        const currentPrice = parseFloat(response.data.price);
        console.log(`💱 [Forex]: ${this.symbol} -> $${currentPrice.toFixed(5)}`);
      }
    } catch (error: any) {
      console.error("⚠️ [ForexEngine]: خطأ أثناء جلب سعر الفوركس:", error.message);
    }
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}