// src/theme.js
// SynapX GymOS — single professional Red & White theme (no dark mode).
// All colour lives here: change `accent` to re-brand the whole app.

export const theme = {
  // ── Surfaces ──────────────────────────────────────────────
  bg:            '#F7F7F9',   // app background — faint warm grey
  surface:       '#FFFFFF',   // top bars, modals, drawers
  card:          '#FFFFFF',   // cards / panels
  border:        '#ECECEF',   // hairline borders
  sidebar:       '#FFFFFF',
  sidebarBorder: '#EEEEF1',

  // ── Text ──────────────────────────────────────────────────
  text:          '#17181C',   // near-black headings/body
  textSub:       '#616570',   // secondary text
  textMuted:     '#9A9DA6',   // muted labels / placeholders

  // ── Brand accent (RED) ────────────────────────────────────
  accent:        '#E11D2E',
  accentSoft:    '#FDECEE',
  accentHover:   '#C4142B',
  accentText:    '#FFFFFF',   // text on top of accent

  // ── Semantic tokens (kept red + neutral to stay on-palette) ─
  // positive / stable states → neutral slate
  green:         '#3F4350',
  greenSoft:     '#F0F1F3',
  // pending / caution → muted grey
  orange:        '#6B7280',
  orangeSoft:    '#F3F4F6',
  // critical / attention → red
  red:           '#E11D2E',
  redSoft:       '#FDECEE',
  // secondary emphasis → deep red
  purple:        '#9B1C2E',
  purpleSoft:    '#FBE9EC',

  // ── Form / table ──────────────────────────────────────────
  inputBg:       '#FFFFFF',
  inputBorder:   '#DEDEE3',
  tableRow:      '#FAFAFB',
  tableRowHover: '#F3F3F5',
  toggleBg:      '#EFEFF2',

  // ── Elevation ─────────────────────────────────────────────
  shadow:        '0 1px 2px rgba(17,18,20,0.04), 0 1px 3px rgba(17,18,20,0.05)',
  shadowMd:      '0 4px 12px rgba(17,18,20,0.06), 0 2px 4px rgba(17,18,20,0.04)',
  shadowLg:      '0 16px 40px rgba(17,18,20,0.12)',
}

// Backwards-compatible export: some modules import { themes }.
// Dark mode is removed, so both point at the single theme.
export const themes = { light: theme, dark: theme }

// One clean typeface throughout — simple and professional.
export const fonts = {
  display: "'Inter', system-ui, sans-serif",
  body:    "'Inter', system-ui, sans-serif",
}

export default theme
