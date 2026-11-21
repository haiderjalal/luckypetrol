export default function ShopLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="shop-loading" style={{ display: "grid", gap: "1rem" }}>
      <div className="shop-card" style={{ height: 72, opacity: 0.6 }} />
      <div className="shop-grid shop-grid--kpi">
        <div className="shop-card" style={{ height: 110, opacity: 0.5 }} />
        <div className="shop-card" style={{ height: 110, opacity: 0.5 }} />
        <div className="shop-card" style={{ height: 110, opacity: 0.5 }} />
      </div>
      <p className="shop-muted">Loading…</p>
    </div>
  );
}
