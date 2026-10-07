// Bundled index lists. The backend downloads the official lists from NSE and
// only falls back to these when NSE cannot be reached. NSE rebalances twice a
// year, so these copies can go stale.

export const NIFTY_50 = [
  'ADANIENT', 'ADANIPORTS', 'APOLLOHOSP', 'ASIANPAINT', 'AXISBANK', 'BAJAJ-AUTO', 'BAJFINANCE',
  'BAJAJFINSV', 'BEL', 'BHARTIARTL', 'CIPLA', 'COALINDIA', 'DRREDDY', 'EICHERMOT', 'ETERNAL',
  'GRASIM', 'HCLTECH', 'HDFCBANK', 'HDFCLIFE', 'HINDALCO', 'HINDUNILVR', 'ICICIBANK', 'INDIGO',
  'INFY', 'ITC', 'JIOFIN', 'JSWSTEEL', 'KOTAKBANK', 'LT', 'M&M', 'MARUTI', 'MAXHEALTH',
  'NESTLEIND', 'NTPC', 'ONGC', 'POWERGRID', 'RELIANCE', 'SBILIFE', 'SBIN', 'SHRIRAMFIN',
  'SUNPHARMA', 'TATACONSUM', 'TMPV', 'TATASTEEL', 'TCS', 'TECHM', 'TITAN', 'TRENT',
  'ULTRACEMCO', 'WIPRO',
]

export const NIFTY_NEXT_50 = [
  'ABB', 'ADANIENSOL', 'ADANIGREEN', 'ADANIPOWER', 'AMBUJACEM', 'BAJAJHFL', 'BAJAJHLDNG',
  'BANKBARODA', 'BOSCHLTD', 'BPCL', 'BRITANNIA', 'CANBK', 'CGPOWER', 'CHOLAFIN', 'DABUR',
  'DIVISLAB', 'DLF', 'DMART', 'GAIL', 'GODREJCP', 'HAL', 'HAVELLS', 'HINDZINC', 'HYUNDAI',
  'ICICIGI', 'ICICIPRULI', 'INDHOTEL', 'IOC', 'IRFC', 'JINDALSTEL', 'JSWENERGY', 'LICI',
  'LODHA', 'LTIM', 'MOTHERSON', 'NAUKRI', 'PFC', 'PIDILITIND', 'PNB', 'RECLTD', 'SHREECEM',
  'SIEMENS', 'SOLARINDS', 'TATAPOWER', 'TORNTPHARM', 'TVSMOTOR', 'UNITDSPR', 'VBL', 'VEDL',
  'ZYDUSLIFE',
]

export const INDEXES = [
  { id: 'nifty50', label: 'NIFTY 50' },
  { id: 'nifty100', label: 'NIFTY 100' },
  { id: 'nifty500', label: 'NIFTY 500' },
]

export const SYMBOL_PATTERN = /^[A-Z0-9&-]{1,20}$/

export function normalizeSymbol(text) {
  return String(text ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9&-]/g, '')
}
