import mongoose from 'mongoose'

// Constituents of an NSE index (nifty50 / nifty100 / nifty500).
const indexListSchema = new mongoose.Schema(
  {
    index: { type: String, required: true, unique: true },
    source: { type: String, enum: ['nse', 'bundled'], required: true },
    stocks: [
      {
        _id: false,
        symbol: String,
        name: String,
        industry: String,
      },
    ],
    fetchedAt: { type: Date, required: true },
  },
  { timestamps: true },
)

export const IndexList = mongoose.model('IndexList', indexListSchema)
