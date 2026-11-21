import EmptyState from "@/components/shop/EmptyState.js";
import PageHeader from "@/components/shop/PageHeader.js";
import Pagination from "@/components/shop/Pagination.js";
import { formatDateTime } from "@/lib/shop/dates.js";
import { readParam } from "@/lib/shop/query.js";
import { getAuditLog } from "@/lib/shop/services/audit.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit log",
};

export default async function AuditPage({ searchParams }) {
  const params = await searchParams;
  const result = getAuditLog({ page: readParam(params.page) });

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change made in the shop: who did it, when, and what changed. Entries cannot be edited or deleted from the screen."
      />

      {result.rows.length === 0 ? (
        <EmptyState title="No activity yet." />
      ) : (
        <div className="shop-table-wrap">
          <table className="shop-table">
            <thead>
              <tr>
                <th scope="col">When (Pakistan time)</th>
                <th scope="col">Who</th>
                <th scope="col">Action</th>
                <th scope="col">What happened</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((entry) => (
                <tr key={entry.id}>
                  <td className="shop-num">{formatDateTime(entry.createdAt)}</td>
                  <td>{entry.actor}</td>
                  <td className="shop-num">{entry.action}</td>
                  <td>{entry.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/shop/audit" />
    </>
  );
}
