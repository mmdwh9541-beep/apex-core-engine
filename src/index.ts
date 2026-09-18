<<<<<<< HEAD
// حماية السيرفر من الانهيار التام بسبب أي أخطاء مفاجئة في الاتصال
=======
// حماية السيرفر من الانهيار التام بسبب أي أخطاء مفاجئة
>>>>>>> 3a48c35 (Enhance: Add isolated virtual wallets, active trade tracker and quiet scheduler)
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason: any) => {
  console.error("❌ Unhandled Rejection:", reason?.message || reason);
});

import http from "http";
import mongoose from "mongoose";
import axios from "axios";
import { Config } from "./core/Config";
import { WSFeedManager } from "./core/WSFeedManager";
import { RiskEngine } from "./core/RiskEngine";
import { ExecutionStrategy } from "./core/ExecutionStrategy";
import { TelegramNotifier } from "./core/TelegramNotifier";
import { ForexEngine } from "./core/ForexEngine";
import { SolanaEngine } from "./core/SolanaEngine";
import { QuantAnalyzer } from "./core/QuantAnalyzer";
import { PositionManager } from "./core/PositionManager";
import { TradePosition, VirtualWallet } from "./core/TradeSignalModel";
import { RiskConfig } from "./core/types";

console.log("⚡ [Apex Engine]: جاري تشغيل المحرك الموحد الهادئ (Crypto + Forex + Web3)...");

// 1. خادم الويب والداشبورد
const server = http.createServer(async (req, res) => {
  if (req.url === "/dashboard") {
    const cryptoW = await VirtualWallet.findOne({ system: "CRYPTO" }).lean();
    const forexW = await VirtualWallet.findOne({ system: "FOREX" }).lean();
    const solanaW = await VirtualWallet.findOne({ system: "SOLANA" }).lean();

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
          .val { font-size: 1.2rem; font-weight: bold; color: #4caf50; }
        </style>
      </head>
      <body>
        <h1 style="text-align: center;">📊 Apex Hybrid Engine - لوحة التحكم المنظمة</h1>
        <div class="container">
          <div class="card">
            <h2>🪙 نظام الكريبتو</h2>
            <p>الرصيد: <span class="val">$${cryptoW?.balance.toFixed(2) || "10,000"}</span></p>
            <p>الصفقات المفتوحة: ${cryptoW?.openPositionsCount || 0}</p>
            <p>ربح: ${cryptoW?.totalWins || 0} | خسارة: ${cryptoW?.totalLosses || 0}</p>
          </div>
          <div class="card">
            <h2>💱 نظام الفوركس</h2>
            <p>الرصيد: <span class="val">$${forexW?.balance.toFixed(2) || "10,000"}</span></p>
            <p>الصفقات المفتوحة: ${forexW?.openPositionsCount || 0}</p>
            <p>ربح: ${forexW?.totalWins || 0} | خسارة: ${forexW?.totalLosses || 0}</p>
          </div>
          <div class="card">
            <h2>🔗 نظام سولانا</h2>
            <p>الرصيد: <span class="val">$${solanaW?.balance.toFixed(2) || "10,000"}</span></p>
            <p>الصفقات المفتوحة: ${solanaW?.openPositionsCount || 0}</p>
            <p>ربح: ${solanaW?.totalWins || 0} | خسارة: ${solanaW?.totalLosses || 0}</p>
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

<<<<<<< HEAD
// ضبط المنفذ والمضيف ليستقبل الطلبات الخارجية بدون نوم أو حظر
=======
>>>>>>> 3a48c35 (Enhance: Add isolated virtual wallets, active trade tracker and quiet scheduler)
const PORT = Number(Config.port) || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 [Render Web]: السيرفر يعمل بنجاح على 0.0.0.0:${PORT}`);
});

// 2. تهيئة المكونات الأساسية
const riskConfig: RiskConfig = { maxDailyDrawdownPercent: 2.0, maxLatencyMs: 250, forexFlushHourUTC: 20, forexFlushMinuteUTC: 15, forexResumeHourUTC: 22 };
const riskEngine = new RiskEngine(riskConfig);
const notifier = new TelegramNotifier(Config.telegram.token, Config.telegram.chatId, Config.botActive);
const positionManager = new PositionManager(notifier);
const strategy = new ExecutionStrategy(notifier);
const quantAnalyzer = new QuantAnalyzer();

// 3. الاتصال بقاعدة البيانات وتهيئة المحافظ واسترجاع الصفقات
if (Config.mongoUri) {
  mongoose.connect(Config.mongoUri)
    .then(async () => {
      console.log("🗄️ [MongoDB]: تم الاتصال بنجاح");
      await positionManager.initializeSystems();
    })
    .catch((err) => console.warn("⚠️ [MongoDB]: خطأ:", err.message));
}

// 4. تشغيل المنظومات الفرعية
const forex = new ForexEngine(notifier);
forex.start(5);
const solana = new SolanaEngine();
solana.initializeWallet();

<<<<<<< HEAD
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
=======
notifier.sendNotification("🚀 *[Apex Engine]*: انطلاق المنظومة بهدوء وسلاسة (محافظ افتراضية + تتبع تلقائي للصفقات)").catch(() => {});
>>>>>>> 3a48c35 (Enhance: Add isolated virtual wallets, active trade tracker and quiet scheduler)

// 5. محرك مراقبة الصفقات المفتوحة وجلب الأسعار الحية (كل دقيقة)
setInterval(async () => {
  try {
    const openTrades = await TradePosition.find({ status: "OPEN" });
    if (openTrades.length === 0) return;

    // جلب أسعار الكريبتو الحالية من بينانس
    const symbols = Array.from(new Set(openTrades.filter(t => t.system === "CRYPTO").map(t => t.symbol)));
    for (const sym of symbols) {
      try {
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${sym}`, { timeout: 4000 });
        const currentPrice = parseFloat(res.data.price);
        
        const matchingTrades = openTrades.filter(t => t.symbol === sym);
        for (const trade of matchingTrades) {
          await positionManager.checkPosition(trade, currentPrice);
        }
      } catch (err: any) {
        // تجاهل أخطاء التايم آوت بهدوء
      }
    }
  } catch (e: any) {
    console.error("⚠️ خطأ دورة مراقبة الصفقات:", e.message);
  }
}, 60000);

// 6. تدفق الكريبتو وفلتر السيولة الهادئ
let recentBuyVolume = 0;
let recentSellVolume = 0;
let tradeCounter = 0;
let lastAlertTime = 0;

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

<<<<<<< HEAD
      if (tradeCounter >= 100) {
        const ofi = quantAnalyzer.calculateOFI(recentBuyVolume, recentSellVolume);
        
        if (ofi > 0.4) {
          await notifier.sendNotification(`🧠 *تنبيه سيولة (صيد الحيتان)*\n• ضغط شرائي قوي مخفي (تجميع)\n• نسبة OFI: +${(ofi*100).toFixed(1)}%`);
        } else if (ofi < -0.4) {
          await notifier.sendNotification(`🧠 *تنبيه سيولة (صيد الحيتان)*\n• ضغط بيعي قوي (تصريف)\n• نسبة OFI: ${(ofi*100).toFixed(1)}%`);
=======
      // فحص تراكم السيولة بدون إزعاج (بحد أقصى مرة كل 30 دقيقة لو كان حاداً جداً)
      if (tradeCounter >= 300) {
        const ofi = quantAnalyzer.calculateOFI(recentBuyVolume, recentSellVolume);
        const now = Date.now();
        
        if (Math.abs(ofi) > 0.65 && (now - lastAlertTime > 1800000)) {
          const dir = ofi > 0 ? "تجميع شرائي قوي 🟢" : "تصريف بيعي قوي 🔴";
          await notifier.sendNotification(`🐋 *رصد حركة سيولة مؤسسية (BTC)*\n• التوصيف: ${dir}\n• شدة التدفق: ${(Math.abs(ofi) * 100).toFixed(1)}%`);
          lastAlertTime = now;
>>>>>>> 3a48c35 (Enhance: Add isolated virtual wallets, active trade tracker and quiet scheduler)
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

// 7. فتح الصفقات المؤكدة فقط عبر مدير المحافظ
strategy.on("signal", async (signal) => {
  try {
<<<<<<< HEAD
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
=======
    let systemType: "CRYPTO" | "FOREX" | "SOLANA" = "CRYPTO";
    if (signal.symbol.includes("SOL")) systemType = "SOLANA";
    else if (!signal.symbol.includes("BTC") && !signal.symbol.includes("ETH")) systemType = "FOREX";

    if (!riskEngine.canTrade()) return;

    // حساب الوقف والهدف بنسبة واقعية (مثلاً وقف 1% وهدف 2%)
    const isBuy = signal.action === "BUY";
    const sl = isBuy ? signal.price * 0.99 : signal.price * 1.01;
    const tp = isBuy ? signal.price * 1.02 : signal.price * 0.98;

    await positionManager.openPosition(
      systemType,
      signal.symbol,
      signal.action as "BUY" | "SELL",
      signal.price,
      parseFloat(sl.toFixed(4)),
      parseFloat(tp.toFixed(4)),
      200, // هامش 200$ لكل صفقة
      "إشارة زخم وسيولة مؤكدة"
    );
>>>>>>> 3a48c35 (Enhance: Add isolated virtual wallets, active trade tracker and quiet scheduler)
  } catch (err: any) {
    console.error("⚠️ خطأ في تنفيذ الإشارة:", err.message);
  }
});

btcFeed.connect();
