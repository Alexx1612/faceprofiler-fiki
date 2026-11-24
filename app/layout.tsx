import type { Metadata, Viewport } from "next";
import { Geist_Mono, Wix_Madefor_Display, Wix_Madefor_Text } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/analytics/analytics";
import { siteName, siteUrl } from "@/lib/seo";

/* Body and headings in Wix Madefor (same family as the landing page); Geist Mono stays for figures and code. */
const siteSans = Wix_Madefor_Text({
  variable: "--font-site-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const siteDisplay = Wix_Madefor_Display({
  variable: "--font-site-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  applicationName: siteName,
  title: "Nau-ino",
  description:
    "Security, access control and analytics on the CCTV cameras a site already has, at a low energy cost.",
};

export const viewport: Viewport = {
  themeColor: "#070f1f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${siteSans.variable} ${siteDisplay.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
