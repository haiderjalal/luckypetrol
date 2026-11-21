import Link from "next/link";

/** Previous and next links that keep the current filters. */
export default function Pagination({ page, pageCount, basePath, query = {} }) {
  if (pageCount <= 1) {
    return null;
  }

  function hrefFor(target) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    if (target > 1) {
      params.set("page", String(target));
    }
    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  }

  return (
    <nav className="shop-pagination" aria-label="Pages">
      {page > 1 ? <Link href={hrefFor(page - 1)}>Previous</Link> : <span aria-disabled="true">Previous</span>}
      <span>
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? <Link href={hrefFor(page + 1)}>Next</Link> : <span aria-disabled="true">Next</span>}
    </nav>
  );
}
