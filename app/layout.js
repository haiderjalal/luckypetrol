import "./globals.css";
import Providers from "@/components/Providers";
import { site } from "@/lib/site";

export const metadata = {
  title: {
    default: `${site.name} | ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b14",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
