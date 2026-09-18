import http from "http";
import mongoose from "mongoose";
import { Config } from "./core/Config";
import { WSFeedManager } from "./core/WSFeedManager";
import { RiskEngine } from "./core/RiskEngine";
import { ExecutionStrategy } from "./core/ExecutionStrategy";
import { TelegramNotifier } from "./core/TelegramNotifier";
import { TradeSignalModel } from "./core/TradeSignalModel";
import { ForexEngine } from "./core/ForexEngine";
import { SolanaEngine } from "./core/SolanaEngine"; // <-- الاستدعاء الجديد لمحرك سولانا
import { RiskConfig } from "./core/types";

console.log("⚡ [Apex Engine]: جاري تشغيل المحرك الموحد (Crypto + Forex + Web3)...");

// خادم الويب والداشبورد
const server = http.createServer((req, res) => {
  // صفحة الداشبورد
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
            <p>إجمالي الأرباح: <span class="profit">+$0.00</span></p>
            <p>إجمالي الخسائر: <span class="loss">-$0.00</span></p>
            <p>الحالة: 🟢 مستقر</p>
          </div>
          <div class="card">
            <h2>💱 نظام الفوركس (OANDA)</h2>
            <p>الصفقات المفتوحة: <span id="forex-open">0</span></p>
            <p>إجمالي الأرباح: <span class="profit">+$0.00</span></p>
            <p>إجمالي الخسائر: <span class="loss">-$0.00</span></p>
            <p>الحالة: 🟡 جاري التقييم</p>
          </div>
          <div class="card">
            <h2>🔗 المحافظ اللامركزية (Solana)</h2>
            <p>العمليات النشطة: <span id="web3-open">0</span></p>
            <p>إجمالي الأرباح: <span class="profit">+$0.00</span></p>
            <p>إجمالي الخسائر: <span class="loss">-$0.00</span></p>
            <p>الحالة: 🟢 مستقر</p>
          </div>
        </div>
      </body>
      </html>
    `);
    return;
  }

  // الرابط الأساسي للحفاظ على نشاط Render
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "running",
      system: "Apex-Hybrid-Core",
      dashboard: "/dashboard",
      timestamp: new Date().toISOString(),
    })
  );
});

server.listen(Config.port, () => {
  console.log(`🌐 [Render Web]: المنفذ النشط: ${Config.port}`);
  console.log(`📊 [Dashboard]: لوحة التحكم متاحة على المسار /dashboard`);
});

// الاتصال بقاعدة البيانات
if (Config.mongoUri) {
  mongoose
    .connect(Config.mongoUri)
    .then(() => console.log("🗄️ [MongoDB]: تم الاتصال بنجاح"))
    .catch((err) => console.warn("⚠️ [MongoDB]: تخطي الاتصال:", err.message));
}

// تهيئة الإشعارات والمخاطر
const riskConfig: RiskConfig = {
  maxDailyDrawdownPercent: 2.0,
  maxLatencyMs: 250,
  forexFlushHourUTC: 20,
  forexFlushMinuteUTC: 15,
  forexResumeHourUTC: 22,
};

const riskEngine = new RiskEngine(riskConfig);
const notifier = new TelegramNotifier(Config.telegram.token, Config.telegram.chatId, Config.botActive);
const strategy = new ExecutionStrategy(notifier);

// تشغيل مراقب الفوركس
const forex = new ForexEngine(notifier);
forex.start(5);

// تشغيل محرك المحافظ اللامركزية (سولانا) - <-- الإضافة الجديدة
const solana = new SolanaEngine();
solana.initializeWallet();

// تشغيل مراقب الكريبتو
const wsStreamUrl = Config.useTestnet
  ? "wss://fstream.binancefuture.com/ws/btcusdt@trade"
  : "wss://fstream.binance.com/ws/btcusdt@trade";

const btcFeed = new WSFeedManager({
  name: "Binance-Futures-BTC",
  url: wsStreamUrl,
});

btcFeed.on("connected", (data) => {
  console.log(`🟢 [Binance WS]: متصل بنجاح (${data.venue})`);
});

btcFeed.on("message", async (msg) => {
  if (msg.e === "trade") {
    const price = parseFloat(msg.p);
    const qty = parseFloat(msg.q);
    const isBuyerMaker = msg.m;
    strategy.onMarketTrade("BTCUSDT", price, qty, isBuyerMaker);
  }
});

// تنفيذ الصفقات التجريبية وتخزينها
strategy.on("signal", async (signal) => {
  console.log(`🎯 [صفقة تجريبية]: تم التقاط إشارة ${signal.action} على ${signal.symbol}`);

  const isSafe = riskEngine.canTrade();
  if (!isSafe) {
    console.warn("⚠️ [Risk Engine]: تم حظر فتح الصفقة بسبب قواطع المخاطر.");
    return;
  }

  await notifier.sendNotification(
    `🚀 *صفقة تجريبية جديدة (Paper Trade)*\n` +
    `• الأصل: \`${signal.symbol}\`\n` +
    `• النوع: *${signal.action}*\n` +
    `• السعر: \`${signal.price}\`\n` +
    `• التوقيت: ${new Date().toLocaleTimeString("ar-EG")}`
  );

  if (mongoose.connection.readyState === 1) {
    try {
      await TradeSignalModel.create({
        ...signal,
        metadata: { mode: "PAPER_TRADING", status: "OPEN" }
      });
    } catch (e: any) {
      console.error("⚠️ فشل حفظ الصفقة:", e.message);
    }
  }
});

btcFeed.on("latency", (lat) => riskEngine.evaluateLatency(lat));
btcFeed.on("disconnected", (info) => console.log(`🔌 [WS]: انقطع الاتصال`));
btcFeed.connect();