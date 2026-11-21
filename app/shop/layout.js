import "./shop.css";

export const metadata = {
  title: "Shop",
  robots: { index: false, follow: false },
};

/** Wraps everything under /shop. Styles and noindex apply to the sign-in page and the internal pages alike. */
export default function ShopLayout({ children }) {
  return children;
}
