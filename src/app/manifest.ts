import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  const base = getSiteUrl();
  return {
    name: "Snapweb — Tangkap Halaman Web",
    short_name: "Snapweb",
    description:
      "Screenshot halaman web gratis: full page, viewport responsif, HD 2×, format PNG/JPEG/WebP, editor crop bawaan.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f0f3f8",
    theme_color: "#1a56b0",
    lang: "id",
    categories: ["utilities", "productivity"],
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}