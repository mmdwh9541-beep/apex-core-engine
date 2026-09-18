import * as dotenv from "dotenv";
dotenv.config();

export interface AppConfig {
  port: number;
  botActive: boolean;
  useTestnet: boolean;
  telegram: {
    token: string;
    chatId: string;
  };
  mongoUri: string;
  binance: {
    apiKey: string;
    apiSecret: string;
  };
  forex: {
    twelveDataApiKey: string;
  };
  gemini: {
    apiKey: string;
  };
}

// دالة لتنظيف أي نصوص قادمة من متغيرات البيئة من المسافات وعلامات التنصيص
const cleanEnv = (val?: string): string => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

const rawMongo = cleanEnv(process.env.MONGODB_URI);

export const Config: AppConfig = {
  port: parseInt(cleanEnv(process.env.PORT) || "3000", 10),
  botActive: process.env.BOT_ACTIVE ? cleanEnv(process.env.BOT_ACTIVE).toLowerCase() === "true" : true,
  useTestnet: process.env.USE_TESTNET ? cleanEnv(process.env.USE_TESTNET).toLowerCase() === "true" : true,
  telegram: {
    token: cleanEnv(process.env.TELEGRAM_TOKEN) || cleanEnv(process.env.TELEGRAM_BOT_TOKEN) || "",
    chatId: cleanEnv(process.env.TELEGRAM_CHAT_ID) || "",
  },
  mongoUri: rawMongo || "mongodb://localhost:27017/apex-engine",
  binance: {
    apiKey: cleanEnv(process.env.BINANCE_API_KEY) || "",
    apiSecret: cleanEnv(process.env.BINANCE_API_SECRET) || "",
  },
  forex: {
    twelveDataApiKey: cleanEnv(process.env.TWELVE_DATA_API_KEY) || "",
  },
  gemini: {
    apiKey: cleanEnv(process.env.GEMINI_API_KEY) || "",
  },
};