import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Coffee Buyer", template: "%s · Coffee Buyer" },
  description: "Specialty coffee from Olisipo, 7g Roaster and Senzu in one list.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Coffee", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2b1d12" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="logo">
              <span className="logo-mark">☕</span> Coffee Buyer
            </Link>
            <nav className="nav">
              <Link href="/?hide=out">Available</Link>
              <Link href="/?purpose=espresso&hide=out">Espresso</Link>
              <Link href="/?purpose=filter&hide=out">Filter</Link>
              <Link href="/?sort=newest">New</Link>
              <Link href="/?bought=1">Bought</Link>
            </nav>
            <form action="/" className="search" role="search">
              <input name="q" type="search" placeholder="Search origin, producer, notes…" aria-label="Search coffee" />
            </form>
          </div>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
