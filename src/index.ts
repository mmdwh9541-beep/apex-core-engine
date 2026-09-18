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

console.log("⚡ [Apex Engine]: جاري تشغيل المحرك الموحد...");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "running", timestamp: new Date().toISOString() }));
});

server.listen(Config.port, () => {
  console.log(`🌐 [Render Web]: المنفذ النشط: ${Config.port}`);
});

if (Config.mongoUri) {
  mongoose.connect(Config.mongoUri)
    .then(() => console.log("🗄️ [MongoDB]: تم الاتصال بنجاح"))
    .catch((err) => console.warn("⚠️ [MongoDB]: خطأ:", err.message));
}

const riskConfig: RiskConfig = { maxDailyDrawdownPercent: 2.0, maxLatencyMs: 250, forexFlushHourUTC: 20, forexFlushMinuteUTC: 15, forexResumeHourUTC: 22 };
const riskEngine = new RiskEngine(riskConfig);
const notifier = new TelegramNotifier(Config.telegram.token, Config.telegram.chatId, Config.botActive);
const strategy = new ExecutionStrategy(notifier);
const quantAnalyzer = new QuantAnalyzer();

const forex = new ForexEngine(notifier);
forex.start(5);
const solana = new SolanaEngine();
solana.initializeWallet();

const wsStreamUrl = Config.useTestnet
  ? "wss://fstream.binancefuture.com/ws/btcusdt@trade"
  : "wss://fstream.binance.com/ws/btcusdt@trade";

const btcFeed = new WSFeedManager({ name: "Binance-Futures-BTC", url: wsStreamUrl });
btcFeed.on("connected", () => console.log("🟢 [Binance WS]: متصل بنجاح"));

btcFeed.on("message", async (msg) => {
  if (msg.e === "trade") {
    const price = parseFloat(msg.p);
    const qty = parseFloat(msg.q);
    strategy.onMarketTrade("BTCUSDT", price, qty, msg.m);
  }
});

strategy.on("signal", async (signal) => {
  let systemName = "كريبتو 🪙";
  if (signal.symbol.includes("SOL")) systemName = "سولانا 🔗";
  else if (!signal.symbol.includes("BTC") && !signal.symbol.includes("ETH")) systemName = "فوركس 💱";

  if (!riskEngine.canTrade()) return;

  await notifier.sendNotification(
    `🚀 *فتح صفقة جديدة*\n• النظام: *${systemName}*\n• الأصل: \`${signal.symbol}\`\n• الاتجاه: *${signal.action}*\n• السعر: \`${signal.price}\``
  );

  if (mongoose.connection.readyState === 1) {
    try {
      await TradeSignalModel.create({ ...signal, metadata: { mode: "PAPER_TRADING", status: "OPEN", system: systemName } });
    } catch (e: any) {
      console.error("⚠️ فشل حفظ الصفقة:", e.message);
    }
  }
});

btcFeed.connect();