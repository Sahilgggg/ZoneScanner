// Small stroke icon set (24×24, currentColor) used across the UI.

function Icon({ children, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconArrowRight = (p) => (
  <Icon {...p}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </Icon>
)

export const IconZones = (p) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="5" rx="1.5" />
    <rect x="3" y="15" width="18" height="5" rx="1.5" />
    <path d="M7 12h10" strokeDasharray="2 2.5" />
  </Icon>
)

export const IconLifecycle = (p) => (
  <Icon {...p}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </Icon>
)

export const IconGauge = (p) => (
  <Icon {...p}>
    <path d="M4 16a8 8 0 1 1 16 0" />
    <path d="M12 16l4-6" />
    <circle cx="12" cy="16" r="1.2" fill="currentColor" />
  </Icon>
)

export const IconLayers = (p) => (
  <Icon {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </Icon>
)

export const IconSectors = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </Icon>
)

export const IconRadar = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 12l6.4-6.4" />
  </Icon>
)

export const IconChart = (p) => (
  <Icon {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 15v-3M12 15V8M16 15v-5" strokeWidth="2.6" />
  </Icon>
)

export const IconSparkles = (p) => (
  <Icon {...p}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
    <path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15z" />
  </Icon>
)

export const IconGithub = (p) => (
  <Icon {...p}>
    <path d="M9 19c-4.5 1.4-4.5-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
  </Icon>
)
