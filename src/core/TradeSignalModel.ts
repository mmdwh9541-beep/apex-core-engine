import mongoose, { Schema, Document } from 'mongoose';

export interface ITradeSignal extends Document {
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  timestamp: Date;
  metadata?: any;
}

const TradeSignalSchema: Schema = new Schema({
  symbol: { type: String, required: true },
  action: { type: String, required: true },
  price: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed },
});

export const TradeSignalModel = mongoose.models.TradeSignal || mongoose.model<ITradeSignal>('TradeSignal', TradeSignalSchema);
export default TradeSignalModel;
