import http from "http";
import mongoose from "mongoose";
import { Config } from "./core/Config";
import { WSFeedManager } from "./core/WSFeedManager";
import { RiskEngine } from "./core/RiskEngine";
import { ExecutionStrategy } from "./core/ExecutionStrategy";
import { TelegramNotifier } from "./core/TelegramNotifier";
import { TradeSignalModel } from "./core/TradeSignalModel";
import { ForexEngine } from "./core/ForexEngine";
import { RiskConfig } from "./core/types";

console.log("⚡ [Apex Engine]: جاري تشغيل المحرك الموحد (Crypto + Forex)...");

// خادم الحفاظ على نشاط الخدمة لـ Render
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "running",
      system: "Apex-Hybrid-Core",
      forexActive: Boolean(Config.forex.twelveDataApiKey),
      geminiActive: Boolean(Config.gemini.apiKey),
      timestamp: new Date().toISOString(),
    })
  );
});

server.listen(Config.port, () => {
  console.log(`🌐 [Render Web]: المنفذ النشط: ${Config.port}`);
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

// تشغيل مراقب الفوركس الاقتصادي
const forex = new ForexEngine(notifier);
forex.start(5); // فحص كل 5 دقائق للحفاظ على استهلاك المعالج ورصيد الـ API

// تشغيل مراقب الكريبتو عبر WebSocket
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

strategy.on("signal", async (signal) => {
  if (mongoose.connection.readyState === 1) {
    try {
      await TradeSignalModel.create(signal);
      console.log(`💾 [MongoDB]: تم حفظ الإشارة بنجاح.`);
    } catch (e: any) {
      console.error("⚠️ فشل حفظ الإشارة في MongoDB:", e.message);
    }
  }
});

btcFeed.on("latency", (lat) => riskEngine.evaluateLatency(lat));
btcFeed.on("disconnected", (info) => console.log(`🔌 [WS]: انقطع الاتصال (${info.reason})`));
btcFeed.connect();