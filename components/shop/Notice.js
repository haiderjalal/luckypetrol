/** A message box for guidance or warnings. `tone` is error, success, warning, info or neutral. */
export default function Notice({ tone = "info", title = "", children }) {
  return (
    <div className={`shop-notice shop-notice--${tone}`} role={tone === "error" ? "alert" : undefined}>
      {title ? <strong>{title} </strong> : null}
      {children}
    </div>
  );
}
