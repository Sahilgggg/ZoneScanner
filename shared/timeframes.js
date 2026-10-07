// Timeframe keys understood by the engine (see engine/candles.js).
export const TIMEFRAME_KEYS = ['daily', 'weekly', 'monthly', 'quarterly', 'halfyearly', 'yearly']

export function isValidTimeframe(value) {
  return TIMEFRAME_KEYS.includes(value)
}
