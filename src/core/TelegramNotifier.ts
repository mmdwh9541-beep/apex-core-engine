import { Telegraf } from "telegraf";
import { TradeSignal } from "./ExecutionStrategy";

export class TelegramNotifier {
  private bot: Telegraf | null = null;
  private chatId: string | null = null;
  private isActive: boolean = true;

  constructor(token: string, chatId: string, isActive: boolean = true) {
    this.isActive = isActive;
    if (this.isActive && token && chatId) {
      this.bot = new Telegraf(token);
      this.chatId = chatId;
    }
  }

  // الدالة الجديدة لإرسال النصوص العامة ورسالة بدء التشغيل
  public async sendNotification(message: string): Promise<void> {
    if (!this.isActive || !this.bot || !this.chatId) return;

    try {
      await this.bot.telegram.sendMessage(this.chatId, message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("⚠️ خطأ أثناء إرسال إشعار التليجرام:", err);
    }
  }

  public async sendSignal(signal: TradeSignal): Promise<void> {
    if (!this.isActive || !this.bot || !this.chatId) return;

    const actionBadge = signal.action === "BUY" ? "🟢 [شراء - LONG]" : "🔴 [بيع - SHORT]";
    const message = 
`🎯 *إشارة قناص جديدة* 🎯
━━━━━━━━━━━━━━━
📌 *النوع:* ${actionBadge}
💎 *الأصل:* ${signal.symbol}
💵 *سعر الدخول:* \`$${signal.entryPrice.toFixed(2)}\`
🛑 *وقف الخسارة (SL):* \`$${signal.stopLoss.toFixed(2)}\`
🎯 *جني الأرباح (TP):* \`$${signal.takeProfit.toFixed(2)}\`
━━━━━━━━━━━━━━━
💡 *السبب:* ${signal.reason}
⏰ *الوقت:* ${new Date(signal.timestamp).toLocaleTimeString()}`;

    try {
      await this.bot.telegram.sendMessage(this.chatId, message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("⚠️ خطأ أثناء إرسال رسالة التليجرام:", err);
    }
  }
}
