import { notFound } from "next/navigation";

import { PrintButton } from "@/components/shop/PrintButton.js";
import InvoiceDocument from "@/components/shop/documents/InvoiceDocument.js";
import { getPublicInvoice } from "@/lib/shop/services/invoices.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

/** Read-only invoice for a customer. Anyone with the link can view it; the link is unguessable and can be cancelled by cancelling the invoice. */
export default async function SharedInvoicePage({ params }) {
  const { token } = await params;
  const shared = await getPublicInvoice(token);
  if (!shared) {
    notFound();
  }

  return (
    <main className="shop-public">
      <div className="shop-no-print" style={{ maxWidth: "210mm", margin: "0 auto 1rem", display: "flex", justifyContent: "flex-end" }}>
        <PrintButton label="Print or save as PDF" />
      </div>
      <InvoiceDocument
        invoice={shared.invoice}
        lines={shared.lines}
        company={shared.company}
        bankAccounts={shared.bankAccounts}
        footer={shared.footer}
      />
    </main>
  );
}
