import type { MetadataRoute } from "next";

import { publicPages, siteUrl } from "@/lib/seo";

export const dynamic = "force-static";

/** sitemap.xml: every public page (lib/seo.ts publicPages). */
export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages.map((path) => ({ url: `${siteUrl}${path}`, priority: path === "/" ? 1 : 0.7 }));
}
