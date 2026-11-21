/** Shown instead of an empty table, with the next step the user can take. */
export default function EmptyState({ title, children = null }) {
  return (
    <div className="shop-empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}
