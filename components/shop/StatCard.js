/** A key figure on the dashboard or a report. `tone="red"` highlights money owed or problems. */
export default function StatCard({ label, value, hint = "", tone = "ink" }) {
  return (
    <div className={`shop-card shop-kpi${tone === "red" ? " shop-kpi--red" : ""}`}>
      <p className="shop-kpi__label">{label}</p>
      <p className="shop-kpi__value">{value}</p>
      {hint ? <p className="shop-kpi__hint">{hint}</p> : null}
    </div>
  );
}
