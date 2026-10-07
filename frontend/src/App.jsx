import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import ScannerPage from './pages/ScannerPage.jsx'
import StockAnalyzer from './pages/StockAnalyzer.jsx'
import { DATA_SOURCE } from './services/marketData.js'
import { DEFAULT_SYMBOL } from './utils/constants.js'

function NotFound() {
  return (
    <div className="card empty-state">
      <h2>Page not found</h2>
      <p>
        <Link to="/scanner">Go to the scanner</Link>
      </p>
    </div>
  )
}

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark">DS</span>
          <span>Demand &amp; Supply Scanner</span>
        </Link>
        <nav className="app-nav">
          <NavLink to="/scanner" className="nav-link">
            Scanner
          </NavLink>
          <NavLink to="/analyzer" className="nav-link">
            Analyzer
          </NavLink>
          {DATA_SOURCE === 'demo' && (
            <span className="demo-badge" title="Prices are synthetic demo data generated in the browser, not real NSE prices.">
              Demo data
            </span>
          )}
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/scanner" replace />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/analyzer" element={<Navigate to={`/analyzer/${DEFAULT_SYMBOL}`} replace />} />
          <Route path="/analyzer/:symbol" element={<StockAnalyzer />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
