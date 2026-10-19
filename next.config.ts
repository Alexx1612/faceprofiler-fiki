import type { NextConfig } from "next";

// Static export: `npm run build` writes a plain HTML site to out/, which any free static host can serve.
// On GitHub Pages the site lives under /<repo>/; the deploy workflow sets NEXT_PUBLIC_BASE_PATH to that.
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
