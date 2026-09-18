import mongoose, { Schema, Document } from "mongoose";

// واجهة المحفظة الافتراضية لكل قطاع
export interface IVirtualWallet extends Document {
  system: "CRYPTO" | "FOREX" | "SOLANA";
  balance: number;
  initialBalance: number;
  openPositionsCount: number;
  totalWins: number;
  totalLosses: number;
  updatedAt: Date;
}

const VirtualWalletSchema: Schema = new Schema({
  system: { type: String, required: true, unique: true },
  balance: { type: Number, required: true, default: 10000 },
  initialBalance: { type: Number, required: true, default: 10000 },
  openPositionsCount: { type: Number, default: 0 },
  totalWins: { type: Number, default: 0 },
  totalLosses: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

// واجهة الصفقة الافتراضية
export interface ITradePosition extends Document {
  system: "CRYPTO" | "FOREX" | "SOLANA";
  symbol: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  allocatedMargin: number;
  status: "OPEN" | "CLOSED_TP" | "CLOSED_SL" | "CLOSED_MANUAL";
  profitAmount?: number;
  openedAt: Date;
  closedAt?: Date;
  reason?: string;
}

const TradePositionSchema: Schema = new Schema({
  system: { type: String, required: true },
  symbol: { type: String, required: true },
  side: { type: String, required: true },
  entryPrice: { type: Number, required: true },
  stopLoss: { type: Number, required: true },
  takeProfit: { type: Number, required: true },
  size: { type: Number, required: true },
  allocatedMargin: { type: Number, required: true },
  status: { type: String, default: "OPEN" },
  profitAmount: { type: Number, default: 0 },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  reason: { type: String },
});

export const VirtualWallet = mongoose.model<IVirtualWallet>("VirtualWallet", VirtualWalletSchema);
export const TradePosition = mongoose.model<ITradePosition>("TradePosition", TradePositionSchema);