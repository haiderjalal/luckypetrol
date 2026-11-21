import Image from "next/image";
import { navLinks, site } from "@/lib/site";
import { brand } from "@/lib/images";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <Image
            src={brand.logo.src}
            alt={brand.logo.alt}
            width={brand.logo.width}
            height={brand.logo.height}
            className="footer__logo"
          />
          <p className="footer__text">{site.description}</p>
        </div>

        <nav aria-label="Footer">
          <h2 className="footer__title">Quick links</h2>
          <ul className="footer__list">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
            <li>
              <a href="#contact">Contact</a>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="footer__title">Contact</h2>
          <ul className="footer__list">
            <li>{site.address}</li>
            <li>
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </li>
            <li>
              <a href={site.phones[0].href}>{site.phones[0].value}</a>
            </li>
            <li>{site.phones[1].value}</li>
          </ul>
        </div>

        <div>
          <h2 className="footer__title">Documents</h2>
          <ul className="footer__list">
            <li>
              <a href={site.companyProfileUrl} target="_blank" rel="noopener noreferrer">
                Company profile (PDF)
              </a>
            </li>
            <li>
              <a href={site.dealerFormUrl} target="_blank" rel="noopener noreferrer">
                Dealer application form (PDF)
              </a>
            </li>
          </ul>

          <h2 className="footer__title" style={{ marginTop: "2.5rem" }}>
            Follow
          </h2>
          <ul className="footer__list">
            <li>
              <a href={site.social.facebook} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </li>
            <li>
              <a href={site.social.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </li>
            <li>
              <a href={site.whatsappUrl} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container footer__bottom">
        <p>
          © {year} {site.legalName}. All rights reserved.
        </p>
        <a href="#top">Back to top</a>
      </div>
    </footer>
  );
}
