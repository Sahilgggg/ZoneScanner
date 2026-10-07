import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { IconGithub } from './components/Icons.jsx'
import HomePage from './pages/HomePage.jsx'
import ScannerPage from './pages/ScannerPage.jsx'
import StockAnalyzer from './pages/StockAnalyzer.jsx'
import { DATA_SOURCE } from './services/marketData.js'
import { analyzerPath, scannerPath } from './utils/preferences.js'

const REPO_URL = 'https://github.com/Sahilgggg/ZoneScanner'

function Logo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <rect x="3" y="4" width="18" height="5" rx="1.5" fill="currentColor" opacity="0.55" />
        <rect x="3" y="15" width="18" height="5" rx="1.5" fill="currentColor" />
        <path d="M7 12h10" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 2.5" />
      </svg>
    </span>
  )
}

function NotFound() {
  return (
    <div className="card empty-state">
      <h2>Page not found</h2>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </div>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="brand">
            <Logo />
            <span>ZoneScanner</span>
          </Link>
          <span className="footer-credit">
            Built with care by <strong>Sahil</strong> &amp; <strong>Yash</strong>
          </span>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to={scannerPath()}>Scanner</Link>
          <Link to={analyzerPath()}>Analyzer</Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            <IconGithub size={16} /> GitHub
          </a>
        </nav>
      </div>
      <p className="footer-note">
        Educational tool, not investment advice. NSE prices via Yahoo Finance (delayed); index lists from NSE.
      </p>
    </footer>
  )
}

export default function App() {
  // Re-render on every navigation so the menu links pick up the latest saved
  // scanner filters (they are read from preferences at render time).
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className={isHome ? 'app app-home' : 'app'}>
      <div className="backdrop" aria-hidden="true" />
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <Logo />
            <span className="brand-name">
              Zone<span className="grad-text">Scanner</span>
            </span>
          </Link>
          <nav className="app-nav" aria-label="Main">
            <NavLink to="/" end className="nav-link">
              Home
            </NavLink>
            <NavLink to={scannerPath()} className="nav-link">
              Scanner
            </NavLink>
            <NavLink to="/analyzer" className="nav-link">
              Analyzer
            </NavLink>
          </nav>
          {DATA_SOURCE === 'demo' ? (
            <span className="demo-badge" title="Prices are synthetic demo data generated in the browser, not real NSE prices.">
              Demo data
            </span>
          ) : (
            <span className="live-badge" title="Real NSE prices via Yahoo Finance, delayed ~15 minutes">
              <span className="live-dot" aria-hidden="true" /> NSE · delayed
            </span>
          )}
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          {/* The menu's Analyzer link lands here and reopens the last stock viewed. */}
          <Route path="/analyzer" element={<Navigate to={analyzerPath()} replace />} />
          <Route path="/analyzer/:symbol" element={<StockAnalyzer />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}
