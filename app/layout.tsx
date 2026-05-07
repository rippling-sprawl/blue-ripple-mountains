import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Blue Ripple Mountains",
  description: "The wook's concert book.",
  icons: { icon: "/favicon.png" },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg-base text-ink min-h-dvh font-sans">
        <SiteNav />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:px-6">{children}</main>
      </body>
    </html>
  );
}
