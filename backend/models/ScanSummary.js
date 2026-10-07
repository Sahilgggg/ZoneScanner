import mongoose from 'mongoose'

// Cached scanner result per stock (a few KB): quote, sector and slim zones
// for every timeframe. Lets a freshly started server answer scans without
// loading every full price history.
const scanSummarySchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, unique: true },
    summary: { type: mongoose.Schema.Types.Mixed, required: true },
    computedAt: { type: Date, required: true },
  },
  { minimize: false },
)

export const ScanSummary = mongoose.model('ScanSummary', scanSummarySchema)
