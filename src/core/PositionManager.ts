import { VirtualWallet, TradePosition, ITradePosition } from "./TradeSignalModel";
import { TelegramNotifier } from "./TelegramNotifier";

export class PositionManager {
  private notifier: TelegramNotifier;

  constructor(notifier: TelegramNotifier) {
    this.notifier = notifier;
  }

  // تهيئة المحافظ الافتراضية واسترجاع الصفقات المفتوحة
  public async initializeSystems(): Promise<ITradePosition[]> {
    const systems: Array<"CRYPTO" | "FOREX" | "SOLANA"> = ["CRYPTO", "FOREX", "SOLANA"];

    for (const sys of systems) {
      let wallet = await VirtualWallet.findOne({ system: sys });
      if (!wallet) {
        wallet = await VirtualWallet.create({
          system: sys,
          balance: 10000,
          initialBalance: 10000,
          openPositionsCount: 0,
          totalWins: 0,
          totalLosses: 0,
        });
        console.log(`💼 [Wallet]: تم إنشاء محفظة افتراضية جديدة لنظام ${sys} برصيد $10,000`);
      }
    }

    // استرجاع الصفقات المفتوحة بعد إعادة تشغيل السيرفر
    const openPositions = await TradePosition.find({ status: "OPEN" });
    if (openPositions.length > 0) {
      console.log(`🔄 [Recovery]: تم استرجاع ${openPositions.length} صفقات مفتوحة للمراقبة.`);     } else {       console.log("ℹ️ [Recovery]: لا توجد صفقات مفتوحة معلقة من الجلسات السابقة.");     }      return openPositions;   }    // فتح صفقة جديدة   public async openPosition(     system: "CRYPTO" \vert{} "FOREX" \vert{} "SOLANA",     symbol: string,     side: "BUY" \vert{} "SELL",     entryPrice: number,     stopLoss: number,     takeProfit: number,     marginAmount: number = 200, // حجم الهامش لكل صفقة افتراضياً     reason: string = ""   ): Promise<ITradePosition \vert{} null> {     const wallet = await VirtualWallet.findOne({ system });     if (!wallet \vert{}\vert{} wallet.balance < marginAmount) {       console.warn(`⚠️ [Wallet]: رصيد غير كافٍ في محفظة ${system} لفتح صفقة ${symbol}`);       return null;     }      // خصم الهامش وتحديث المحفظة     wallet.balance -= marginAmount;     wallet.openPositionsCount += 1;     wallet.updatedAt = new Date();     await wallet.save();      const positionSize = marginAmount / entryPrice;      const position = await TradePosition.create({       system,       symbol,       side,       entryPrice,       stopLoss,       takeProfit,       size: positionSize,       allocatedMargin: marginAmount,       status: "OPEN",       openedAt: new Date(),       reason,     });      // إرسال بطاقة دخول الصفقة لتليجرام     await this.notifier.sendNotification(       `🟢 *إشارة دخول مؤكدة (${system})*\n` +
      `• الزوج: *${symbol}*\n` +       `• الاتجاه: *${side === "BUY" ? "شراء 📈" : "بيع 📉"}*\n` +
      `• سعر الدخول: \`$${entryPrice}\`\n` +
      `• وقف الخسارة (SL): \`$${stopLoss}\`\n` +
      `• الهدف (TP): \`$${takeProfit}\`\n` +
      `• سبب الدخول: ${reason \vert{}\vert{} "توافق السيولة والاتجاه"}`     );      return position;   }    // فحص وإغلاق الصفقة بناءً على السعر اللحظي   public async checkPosition(pos: ITradePosition, currentPrice: number): Promise<boolean> {     let closed = false;     let profitAmount = 0;     let status: "CLOSED_TP" \vert{} "CLOSED_SL" = "CLOSED_TP";      if (pos.side === "BUY") {       if (currentPrice >= pos.takeProfit) {         status = "CLOSED_TP";         profitAmount = (pos.takeProfit - pos.entryPrice) * pos.size;         closed = true;       } else if (currentPrice <= pos.stopLoss) {         status = "CLOSED_SL";         profitAmount = (pos.stopLoss - pos.entryPrice) * pos.size;         closed = true;       }     } else { // SELL       if (currentPrice <= pos.takeProfit) {         status = "CLOSED_TP";         profitAmount = (pos.entryPrice - pos.takeProfit) * pos.size;         closed = true;       } else if (currentPrice >= pos.stopLoss) {         status = "CLOSED_SL";         profitAmount = (pos.entryPrice - pos.stopLoss) * pos.size;         closed = true;       }     }      if (closed) {       pos.status = status;       pos.profitAmount = profitAmount;       pos.closedAt = new Date();       await pos.save();        // رد الهامش مع الربح/الخسارة إلى المحفظة       const wallet = await VirtualWallet.findOne({ system: pos.system });       if (wallet) {         wallet.balance += pos.allocatedMargin + profitAmount;         wallet.openPositionsCount = Math.max(0, wallet.openPositionsCount - 1);         if (profitAmount > 0) wallet.totalWins += 1;         else wallet.totalLosses += 1;         wallet.updatedAt = new Date();         await wallet.save();       }        const icon = status === "CLOSED_TP" ? "🎯" : "🛑";       const resultText = status === "CLOSED_TP" ? "تم تحقيق الهدف (TP)" : "ضرب وقف الخسارة (SL)";       const pnlSign = profitAmount >= 0 ? `+$${profitAmount.toFixed(2)}` : `-$${Math.abs(profitAmount).toFixed(2)}`;        await this.notifier.sendNotification(         `${icon} *إغلاق صفقة (${pos.system})*\n` +         `• الزوج: *${pos.symbol}*\n` +
        `• النتيجة: *${resultText}*\n` +         `• العائد (PnL): *${pnlSign}*\n` +
        `• الرصيد الحالي: \`$${wallet?.balance.toFixed(2)}\``
      );
      return true;
    }

    return false;
  }
}