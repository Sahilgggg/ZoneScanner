import axios from 'axios'

// In development, Vite proxies /api to http://localhost:5000 (see vite.config.js).
// For a deployed build, set VITE_API_BASE_URL in frontend/.env.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000, // a stock's first download (full history) can take a few seconds
})

// Turn every failure into an Error with a readable message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error)

    let message = error.message
    if (error.response?.data?.message) {
      message = error.response.data.message
    } else if (error.code === 'ECONNABORTED') {
      message = 'The request timed out.'
    } else if (!error.response || [500, 502, 503, 504].includes(error.response.status)) {
      // No JSON message: the backend could not be reached.
      message = import.meta.env.DEV
        ? 'Cannot reach the backend server. Start it with `npm run dev` in the backend folder.'
        : 'The data server is not responding. If it was idle it may be waking up (up to a minute) — please try again.'
    }
    const wrapped = new Error(message)
    wrapped.status = error.response?.status
    return Promise.reject(wrapped)
  },
)

const stockPath = (symbol, rest) => `/stocks/${encodeURIComponent(symbol)}/${rest}`

// Every function accepts an optional { signal } (from AbortController) so a
// request can be cancelled when the user switches stock or timeframe.

export async function searchStocks(query, { signal } = {}) {
  const { data } = await api.get('/stocks/search', { params: { q: query }, signal })
  return data
}

export async function getQuote(symbol, { signal } = {}) {
  const { data } = await api.get(stockPath(symbol, 'quote'), { signal })
  return data
}

export async function getCandles(symbol, timeframe, { signal } = {}) {
  const { data } = await api.get(stockPath(symbol, 'candles'), { params: { timeframe }, signal })
  return data
}

export async function getZones(symbol, timeframe, { signal } = {}) {
  const { data } = await api.get(stockPath(symbol, 'zones'), { params: { timeframe }, signal })
  return data
}

export async function getMultiTimeframe(symbol, { signal } = {}) {
  const { data } = await api.get(stockPath(symbol, 'multi-timeframe'), { signal })
  return data
}

export async function getSummary(symbol, { signal } = {}) {
  const { data } = await api.get(stockPath(symbol, 'summary'), { signal })
  return data
}

export async function getUniverse(id, { signal } = {}) {
  const { data } = await api.get(`/universes/${encodeURIComponent(id)}`, { signal })
  return data
}

export default api
