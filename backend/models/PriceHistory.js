import mongoose from 'mongoose'

// One document per NSE symbol holding its full daily candle history.
const candleSchema = new mongoose.Schema(
  {
    time: { type: String, required: true }, // 'YYYY-MM-DD' (IST trading day)
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    volume: Number,
  },
  { _id: false },
)

const priceHistorySchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, unique: true, index: true },
    name: String,
    source: { type: String, default: 'yahoo' },
    candles: { type: [candleSchema], default: [] },
    fetchedAt: { type: Date, required: true },
  },
  { timestamps: true },
)

export const PriceHistory = mongoose.model('PriceHistory', priceHistorySchema)
