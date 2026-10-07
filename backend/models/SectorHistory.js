import mongoose from 'mongoose'

// Equal-weighted sector index built from NIFTY 500 constituents (one per NSE industry).
const sectorHistorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    members: { type: [String], default: [] },
    candles: {
      type: [
        {
          _id: false,
          time: String,
          open: Number,
          high: Number,
          low: Number,
          close: Number,
          volume: Number, // traded value (₹) summed over members
        },
      ],
      default: [],
    },
    builtAt: { type: Date, required: true },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
)

export const SectorHistory = mongoose.model('SectorHistory', sectorHistorySchema)
