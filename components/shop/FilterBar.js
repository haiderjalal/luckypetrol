import Link from "next/link";

/** A GET form for searching and filtering lists. Works without JavaScript; the URL holds the filters. */
export default function FilterBar({ children, clearHref = "" }) {
  return (
    <form method="get" className="shop-filters" role="search">
      {children}
      <div className="shop-filters__actions">
        <button type="submit" className="shop-button shop-button--ghost">
          Apply
        </button>
        {clearHref ? <Link href={clearHref}>Clear filters</Link> : null}
      </div>
    </form>
  );
}
