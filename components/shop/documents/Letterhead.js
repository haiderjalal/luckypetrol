import Image from "next/image";

import { brand } from "@/lib/images.js";
import { formatMobileForDisplay } from "@/lib/shop/phone.js";

/** Company letterhead with the Lucky Petroleum logo, used at the top of printed documents. */
export default function Letterhead({ company }) {
  const phones = [company.phone, company.officePhone].filter(Boolean).join("  |  ");
  const taxIds = [company.ntn ? `NTN ${company.ntn}` : null, company.strn ? `STRN ${company.strn}` : null].filter(Boolean).join("  |  ");

  return (
    <header className="shop-doc__letterhead">
      <Image src={brand.logo.src} alt={brand.logo.alt} width={brand.logo.width} height={brand.logo.height} className="shop-doc__logo" priority />
      <div className="shop-doc__company">
        <p className="shop-doc__company-name">{company.legalName || company.name}</p>
        <p>{company.address}</p>
        {phones ? <p>{phones}</p> : null}
        {company.email ? <p>{company.email}</p> : null}
        {taxIds ? <p>{taxIds}</p> : null}
        {company.whatsapp ? <p>WhatsApp {formatMobileForDisplay(company.whatsapp)}</p> : null}
      </div>
    </header>
  );
}
