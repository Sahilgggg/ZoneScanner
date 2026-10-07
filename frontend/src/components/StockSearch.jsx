import { useEffect, useMemo, useRef, useState } from 'react'
import { ALL_SYMBOLS } from '../data/universes.js'
import { searchStocks } from '../services/api.js'
import { DATA_SOURCE } from '../services/marketData.js'

// NSE symbols contain letters, digits, "&" (M&M) and "-" (BAJAJ-AUTO).
function normalize(text) {
  return text.toUpperCase().replace(/[^A-Z0-9&-]/g, '')
}

// The parent passes key={symbol}, so this component remounts with a fresh
// input whenever the selected stock changes.
export default function StockSearch({ value = '', onSelect }) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const formRef = useRef(null)

  const [remote, setRemote] = useState({ q: null, items: [] })
  const q = normalize(query)

  const localMatches = useMemo(() => {
    const list = q ? ALL_SYMBOLS.filter((s) => s.includes(q)).sort((a, b) => a.indexOf(q) - b.indexOf(q)) : ALL_SYMBOLS
    return list.slice(0, 8).map((symbol) => ({ symbol, name: '' }))
  }, [q])

  // With real data, search all NIFTY 500 symbols and company names on the backend.
  useEffect(() => {
    if (DATA_SOURCE !== 'api' || !open || !q) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchStocks(q, { signal: controller.signal })
        .then((items) => setRemote({ q, items }))
        .catch(() => setRemote({ q, items: [] }))
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q, open])

  const matches = remote.q === q && remote.items.length ? remote.items.slice(0, 8) : localMatches

  // Close the dropdown when clicking outside the search box.
  useEffect(() => {
    function handleClick(event) {
      if (formRef.current && !formRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function choose(symbol) {
    const clean = normalize(symbol)
    if (!clean) return
    setQuery(clean)
    setOpen(false)
    setActive(-1)
    onSelect(clean)
  }

  function handleSubmit(event) {
    event.preventDefault()
    const highlighted = open && active >= 0 ? matches[active]?.symbol : null
    choose(highlighted ?? query)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, matches.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, -1))
    } else if (event.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  return (
    <form className="stock-search" role="search" ref={formRef} onSubmit={handleSubmit}>
      <label htmlFor="stock-search-input" className="visually-hidden">
        Stock symbol
      </label>
      <input
        id="stock-search-input"
        className="input"
        type="text"
        placeholder="Search NSE symbol or company, e.g. USHAMART"
        autoComplete="off"
        spellCheck="false"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value.toUpperCase())
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls="stock-search-list"
      />
      <button type="submit" className="btn btn-primary">
        Analyze
      </button>

      {open && matches.length > 0 && (
        <ul className="search-list" id="stock-search-list" role="listbox">
          {matches.map(({ symbol, name }, i) => (
            <li
              key={symbol}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'search-item active' : 'search-item'}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(symbol)
              }}
            >
              <span>
                {symbol}
                {name && <span className="search-name">{name}</span>}
              </span>
              <span className="search-exchange">NSE</span>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
