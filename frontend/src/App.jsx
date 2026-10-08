import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { IconGithub } from './components/Icons.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import HomePage from './pages/HomePage.jsx'
import ScannerPage from './pages/ScannerPage.jsx'
import StockAnalyzer from './pages/StockAnalyzer.jsx'
import { DATA_SOURCE } from './services/marketData.js'
import { analyzerPath, scannerPath } from './utils/preferences.js'

const REPO_URL = 'https://github.com/Sahilgggg/ZoneScanner'

// Mark: a supply band over a demand band with price weaving between them.
function Logo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 28 28" width="26" height="26">
        <rect x="2" y="4" width="24" height="6" className="mark-supply" />
        <rect x="2" y="18" width="24" height="6" className="mark-demand" />
        <path d="M3 21 L9 9 L14 20 L19 8 L25 19" className="mark-line" />
      </svg>
    </span>
  )
}

function Wordmark() {
  return (
    <span className="wordmark">
      Zone<em>Scanner</em>
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
            <Wordmark />
          </Link>
          <span className="footer-credit">
            Designed &amp; built by <strong>Sahil</strong> and <strong>Yash</strong>
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
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <Logo />
            <Wordmark />
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
          <div className="header-tools">
            {DATA_SOURCE === 'demo' ? (
              <span className="demo-badge" title="Prices are synthetic demo data generated in the browser, not real NSE prices.">
                Demo data
              </span>
            ) : (
              <span className="live-badge" title="Real NSE prices via Yahoo Finance, delayed ~15 minutes">
                <span className="live-dot" aria-hidden="true" /> NSE · delayed
              </span>
            )}
            <ThemeToggle />
          </div>
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
