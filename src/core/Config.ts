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

export const Config: AppConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  botActive: process.env.BOT_ACTIVE ? process.env.BOT_ACTIVE.toLowerCase() === "true" : true,
  useTestnet: process.env.USE_TESTNET ? process.env.USE_TESTNET.toLowerCase() === "true" : true,
  telegram: {
    token: process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  },
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/apex-engine",
  binance: {
    apiKey: process.env.BINANCE_API_KEY || "",
    apiSecret: process.env.BINANCE_API_SECRET || "",
  },
  forex: {
    twelveDataApiKey: process.env.TWELVE_DATA_API_KEY || "",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
  },
};