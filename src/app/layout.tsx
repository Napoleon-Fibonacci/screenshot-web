import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Chakra_Petch } from "next/font/google";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

const siteUrl = getSiteUrl();
const title = "Snapweb — Tangkap Halaman Web: Full Page, Viewport & Crop";
const description =
  "Ambil screenshot halaman web apa pun secara gratis: full page, pilih lebar viewport (ponsel, tablet, laptop, desktop), format PNG/JPEG/WebP, resolusi HD 2×, lalu crop area yang kamu mau langsung di browser.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | Snapweb",
  },
  description,
  keywords: [
    "screenshot website",
    "tangkap halaman web",
    "full page screenshot",
    "screenshot gratis",
    "screenshot HD",
    "crop screenshot",
    "web capture",
    "screen capture online",
  ],
  applicationName: "Snapweb",
  authors: [{ name: "Snapweb" }],
  creator: "Snapweb",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "Snapweb",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "technology",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f0f3f8",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Snapweb",
  url: siteUrl,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  description,
  inLanguage: "id-ID",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "IDR",
  },
  featureList: [
    "Screenshot full page",
    "Viewport ponsel, tablet, laptop, desktop",
    "Format PNG, JPEG, WebP",
    "Resolusi HD 2×",
    "Editor crop bawaan",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${atkinson.variable} ${chakra.variable}`}>
      <body className="min-h-dvh">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      </body>
    </html>
  );
}
