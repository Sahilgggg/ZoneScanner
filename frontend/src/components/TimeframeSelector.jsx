import { TIMEFRAMES } from '../utils/constants.js'

// Segmented timeframe switch. `compact` shows chart-style labels (1D, 1W, …)
// for use inside a chart header.
export default function TimeframeSelector({ value, onChange, disabled = false, compact = false }) {
  return (
    <div className={compact ? 'segmented segmented-compact' : 'segmented'} role="group" aria-label="Timeframe">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          type="button"
          className={tf.value === value ? 'segment active' : 'segment'}
          aria-pressed={tf.value === value}
          aria-label={compact ? tf.label : undefined}
          title={tf.label}
          disabled={disabled}
          onClick={() => tf.value !== value && onChange(tf.value)}
        >
          {compact ? tf.short : tf.label}
        </button>
      ))}
    </div>
  )
}
