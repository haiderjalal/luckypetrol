import "../shop/shop.css";

export const metadata = {
  robots: { index: false, follow: false },
};

/** Public pages that share a document with a customer. They do not sit behind sign-in. */
export default function ShareLayout({ children }) {
  return children;
}
