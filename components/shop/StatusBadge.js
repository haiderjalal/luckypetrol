/** Coloured status label. Tones: green, amber, red, blue, grey. Colour is never the only cue: the text says the status. */
export default function StatusBadge({ tone = "grey", children }) {
  return <span className={`shop-badge shop-badge--${tone}`}>{children}</span>;
}
