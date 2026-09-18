// حماية السيرفر من الانهيار التام بسبب أي أخطاء مفاجئة في الاتصال
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason: any) => {
  console.error("❌ Unhandled Rejection:", reason?.message || reason);
});

import http from "http";
import mongoose from "mongoose";
import { Config } from "./core/Config";
import { WSFeedManager } from "./core/WSFeedManager";
import { RiskEngine } from "./core/RiskEngine";
import { ExecutionStrategy } from "./core/ExecutionStrategy";
import { TelegramNotifier } from "./core/TelegramNotifier";
import { TradeSignalModel } from "./core/TradeSignalModel";
import { ForexEngine } from "./core/ForexEngine";
import { SolanaEngine } from "./core/SolanaEngine";
import { QuantAnalyzer } from "./core/QuantAnalyzer";
import { RiskConfig } from "./core/types";

console.log("⚡ [Apex Engine]: جاري تشغيل المحرك الموحد (Crypto + Forex + Web3)...");

// 1. خادم الويب والداشبورد
const server = http.createServer((req, res) => {
  if (req.url === "/dashboard") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>Apex Core - لوحة التحكم</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; padding: 20px; }
          .container { display: flex; gap: 20px; flex-wrap: wrap; }
          .card { background-color: #1e1e1e; padding: 20px; border-radius: 10px; flex: 1; min-width: 250px; border: 1px solid #333; }
          h2 { color: #00ffcc; text-align: center; border-bottom: 1px solid #333; padding-bottom: 10px; }
          .profit { color: #4caf50; font-weight: bold; }
          .loss { color: #f44336; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1 style="text-align: center;">📊 Apex Hybrid Engine - لوحة التحكم الشاملة</h1>
        <div class="container">
          <div class="card">
            <h2>🪙 نظام الكريبتو (Binance)</h2>
            <p>الصفقات المفتوحة: <span id="crypto-open">0</span></p>
            <p>الحالة: 🟢 مستقر</p>
          </div>
          <div class="card">
            <h2>💱 نظام الفوركس (OANDA)</h2>
            <p>الحالة: 🟡 جاري التقييم</p>
          </div>
          <div class="card">
            <h2>🔗 المحافظ اللامركزية (Solana)</h2>
            <p>الحالة: 🟢 مستقر (قراءة فقط)</p>
          </div>
        </div>
      </body>
      </html>
    `);
    return;
  }

  // نقطة فحص الصحة لـ UptimeRobot و Render
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "running", timestamp: new Date().toISOString() }));
});

// ضبط المنفذ والمضيف ليستقبل الطلبات الخارجية بدون نوم أو حظر
const PORT = Number(Config.port) || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 [Render Web]: السيرفر يعمل بنجاح على 0.0.0.0:${PORT}`);
});

// 2. الاتصال بقاعدة البيانات
if (Config.mongoUri) {
  mongoose.connect(Config.mongoUri)
    .then(() => console.log("🗄️ [MongoDB]: تم الاتصال بنجاح"))
    .catch((err) => console.warn("⚠️ [MongoDB]: خطأ:", err.message));
}

// 3. تهيئة المحركات والمخاطر والإشعارات
const riskConfig: RiskConfig = { maxDailyDrawdownPercent: 2.0, maxLatencyMs: 250, forexFlushHourUTC: 20, forexFlushMinuteUTC: 15, forexResumeHourUTC: 22 };
const riskEngine = new RiskEngine(riskConfig);
const notifier = new TelegramNotifier(Config.telegram.token, Config.telegram.chatId, Config.botActive);
const strategy = new ExecutionStrategy(notifier);
const quantAnalyzer = new QuantAnalyzer();

// تشغيل الأنظمة الجانبية
const forex = new ForexEngine(notifier);
forex.start(5);
const solana = new SolanaEngine();
solana.initializeWallet();

// إرسال إشعار تليجرام عند بدء التشغيل بنجاح
notifier.sendNotification("🚀 *[Apex Engine]*: تم تشغيل المحرك الموحد بنجاح على Render وجاهز لمتابعة الأسواق!").catch(() => {});

// 4. دالة لمحاكاة إغلاق الصفقات التجريبية وإرسال تقرير الأرباح للتلجرام
function simulateTradeClose(system: string, symbol: string, action: string, entryPrice: number) {
  setTimeout(async () => {
    try {
      const pnlPercent = (Math.random() * 3) - 1; 
      const exitPrice = action === "BUY" ? entryPrice * (1 + pnlPercent/100) : entryPrice * (1 - pnlPercent/100);
      const isWin = pnlPercent >= 0;
      
      await notifier.sendNotification(
        `🔔 *إغلاق صفقة (${system})*\n` +
        `• الأصل: \`${symbol}\`\n` +
        `• الاتجاه: *${action}*\n` +
        `• الدخول: \`${entryPrice.toFixed(4)}\`\n` +
        `• الخروج: \`${exitPrice.toFixed(4)}\`\n` +
        `• النتيجة: ${isWin ? "✅ ربح" : "❌ خسارة"} *${pnlPercent.toFixed(2)}%*\n` +
        `• التوقيت: ${new Date().toLocaleTimeString("ar-EG")}`
      );
    } catch (e: any) {
      console.error("⚠️ خطأ في محاكاة إغلاق الصفقة:", e.message);
    }
  }, 60000); 
}

// 5. محرك الكريبتو وتدفق البيانات الحية
let recentBuyVolume = 0;
let recentSellVolume = 0;
let tradeCounter = 0;

const wsStreamUrl = Config.useTestnet
  ? "wss://fstream.binancefuture.com/ws/btcusdt@trade"
  : "wss://fstream.binance.com/ws/btcusdt@trade";

const btcFeed = new WSFeedManager({ name: "Binance-Futures-BTC", url: wsStreamUrl });

btcFeed.on("connected", () => console.log(`🟢 [Binance WS]: متصل بنجاح`));

btcFeed.on("message", async (msg) => {
  try {
    if (msg.e === "trade") {
      const price = parseFloat(msg.p);
      const qty = parseFloat(msg.q);
      const isBuyerMaker = msg.m;

      if (isBuyerMaker) recentSellVolume += qty;
      else recentBuyVolume += qty;
      
      tradeCounter++;

      if (tradeCounter >= 100) {
        const ofi = quantAnalyzer.calculateOFI(recentBuyVolume, recentSellVolume);
        
        if (ofi > 0.4) {
          await notifier.sendNotification(`🧠 *تنبيه سيولة (صيد الحيتان)*\n• ضغط شرائي قوي مخفي (تجميع)\n• نسبة OFI: +${(ofi*100).toFixed(1)}%`);
        } else if (ofi < -0.4) {
          await notifier.sendNotification(`🧠 *تنبيه سيولة (صيد الحيتان)*\n• ضغط بيعي قوي (تصريف)\n• نسبة OFI: ${(ofi*100).toFixed(1)}%`);
        }

        recentBuyVolume = 0;
        recentSellVolume = 0;
        tradeCounter = 0;
      }

      strategy.onMarketTrade("BTCUSDT", price, qty, isBuyerMaker);
    }
  } catch (err: any) {
    console.error("⚠️ خطأ معالجة تدفق البيانات:", err.message);
  }
});

// 6. استلام إشارات الدخول وفتح الصفقات
strategy.on("signal", async (signal) => {
  try {
    let systemName = "كريبتو 🪙";
    if (signal.symbol.includes("SOL")) systemName = "سولانا 🔗";
    else if (!signal.symbol.includes("BTC") && !signal.symbol.includes("ETH")) systemName = "فوركس 💱";

    const isSafe = riskEngine.canTrade();
    if (!isSafe) {
      await notifier.sendNotification(`⚠️ *حظر صفقة (${systemName})*\nتم منع فتح صفقة \`${signal.symbol}\` للحماية من المخاطر.`);
      return;
    }

    await notifier.sendNotification(
      `🚀 *فتح صفقة جديدة*\n` +
      `• النظام: *${systemName}*\n` +
      `• الأصل: \`${signal.symbol}\`\n` +
      `• الاتجاه: *${signal.action}*\n` +
      `• سعر الدخول: \`${signal.price}\`\n` +
      `• التوقيت: ${new Date().toLocaleTimeString("ar-EG")}`
    );

    if (mongoose.connection.readyState === 1) {
      try {
        await TradeSignalModel.create({ ...signal, metadata: { mode: "PAPER_TRADING", status: "OPEN", system: systemName } });
      } catch (e: any) {
        console.error("⚠️ فشل حفظ الصفقة:", e.message);
      }
    }

    simulateTradeClose(systemName, signal.symbol, signal.action, signal.price);
  } catch (err: any) {
    console.error("⚠️ خطأ في تنفيذ الإشارة:", err.message);
  }
});

btcFeed.connect();
