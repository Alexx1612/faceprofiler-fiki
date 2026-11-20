import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo";

export const dynamic = "force-static";

/** robots.txt: everything may be crawled; names the sitemap. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${siteUrl}/sitemap.xml` };
}
