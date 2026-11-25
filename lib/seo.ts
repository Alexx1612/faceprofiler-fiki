import type { Metadata } from "next";

/**
 * Search and link-preview metadata shared by every page.
 * The public address is always the GitHub Pages one, whatever base path a local build uses, so
 * canonical URLs, Open Graph images, the sitemap and robots.txt never point at localhost.
 * Checked by the Nau-ino repo's tools/site_audit.py.
 */
export const siteUrl = "https://alexx1612.github.io/faceprofiler-fiki";
export const siteName = "Nau-ino";
export const ogImage = { url: `${siteUrl}/og.jpg`, width: 1200, height: 630, alt: "Nau-ino: face check on existing CCTV cameras" };

/** Every public page, for the sitemap and llms.txt. */
export const publicPages = ["/", "/landing/", "/pitch/", "/M2/", "/M3/", "/M4/", "/M5/", "/manuals/", "/privacy/", "/face3d/"];

/** Title, description, canonical URL, Open Graph and Twitter card for one page. */
export function pageMetadata({ path, title, description, image = ogImage }: {
  path: string;
  title: string;
  description: string;
  image?: { url: string; width: number; height: number; alt?: string };
}): Metadata {
  const url = `${siteUrl}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName, type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
