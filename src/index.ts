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

let liveSignals: any[] = [];
let accountStats = {
  initialBalance: 10000,
  currentBalance: 10000,
  totalProfit: 0,
  winRate: "0.0%",
  activePositions: 0
};

function renderDashboardHTML(): string {
  const pnlColor = accountStats.totalProfit >= 0 ? "#10b981" : "#ef4444";
  const rows = liveSignals.slice(-8).reverse().map(s => `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 12px;">${s.time || new Date().toLocaleTimeString()}</td>
      <td style="padding: 12px; font-weight: bold; color: #38bdf8;">${s.symbol}</td>
      <td style="padding: 12px;"><span style="background: ${s.action === 'BUY' ? '#065f46' : '#991b1b'}; color: white; padding: 3px 8px; border-radius: 4px;">${s.action}</span></td>       <td style="padding: 12px;">$${Number(s.price).toLocaleString()}</td>
      <td style="padding: 12px; color: #a855f7;">${s.system || 'Crypto/Forex'}</td>
      <td style="padding: 12px; color: #10b981;">نشطة 🟢</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="10">
  <title>Apex Engine | لوحة التحكم الذكية</title>
  <style>
    body { background-color: #0b0f19; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
    .container { max-width: 1200px; margin: auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2937; padding-bottom: 15px; margin-bottom: 25px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 25px; }
    .card { background: #111827; border: 1px solid #1f2937; padding: 20px; border-radius: 10px; }
    .card-title { color: #9ca3af; font-size: 13px; margin-bottom: 8px; }
    .card-val { font-size: 24px; font-weight: bold; }
    .table-container { background: #111827; border: 1px solid #1f2937; border-radius: 10px; overflow-x: auto; padding: 15px; }
    table { width: 100%; border-collapse: collapse; text-align: right; }
    th { color: #9ca3af; padding: 12px; border-bottom: 2px solid #1f2937; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 style="margin: 0; font-size: 22px; color: #38bdf8;">⚡ Apex Core Engine</h1>
        <small style="color: #10b981;">● الخادم يعمل بنجاح (محدّث تلقائياً كل 10 ثوانٍ)</small>
      </div>
      <div>
        <span style="background: #1e293b; padding: 6px 12px; border-radius: 6px; font-size: 14px;">محرك هجين (Forex + Crypto + Solana)</span>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">رصيد الحساب (Wallet Balance)</div>
        <div class="card-val">$${accountStats.currentBalance.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="card-title">إجمالي الأرباح / الخسائر (PnL)</div>
        <div class="card-val" style="color: ${pnlColor};">${accountStats.totalProfit >= 0 ? '+' : ''}$${accountStats.totalProfit.toFixed(2)}</div>
      </div>
      <div class="card">
        <div class="card-title">الصفقات النشطة</div>
        <div class="card-val" style="color: #38bdf8;">${accountStats.activePositions}</div>
      </div>
      <div class="card">
        <div class="card-title">نسبة النجاح المقدرة</div>
        <div class="card-val" style="color: #10b981;">${accountStats.winRate}</div>
      </div>
    </div>

    <div class="table-container">
      <h3 style="margin-top: 0; margin-bottom: 15px;">📊 سجل الصفقات الحية والأوامر</h3>
      <table>
        <thead>
          <tr>
            <th>الوقت</th>
            <th>الزوج / الأصل</th>
            <th>النوع</th>
            <th>سعر التنفيذ</th>
            <th>المنظومة</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows : '<tr><td colspan="6" style="text-align: center; padding: 25px; color: #6b7280;">بانتظار التقاط أول فرصة سيولة من السوق...</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(renderDashboardHTML());
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

  const currentTrade = {
    time: new Date().toLocaleTimeString('ar-EG'),
    symbol: signal.symbol,
    action: signal.action,
    price: signal.price,
    system: systemName
  };

  liveSignals.push(currentTrade);
  accountStats.activePositions = liveSignals.length;

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