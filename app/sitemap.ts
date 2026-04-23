import { statSync } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { getCachedPublicBlogPosts } from "@/lib/blog";
import { SITE_OG_IMAGE, SITE_URL } from "@/lib/site";

function getLastModifiedFor(relativePath: string) {
  return statSync(path.join(/* turbopackIgnore: true */ process.cwd(), relativePath)).mtime;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const homeLastModified = getLastModifiedFor("app/layout.tsx");
  const privacyLastModified = getLastModifiedFor("public/privacy-policy.md");
  const termsLastModified = getLastModifiedFor("public/terms-of-service.md");
  const blogLastModified = getLastModifiedFor("app/(main)/news/page.tsx");
  const supportLastModified = getLastModifiedFor("app/support/page.tsx");
  const llmsLastModified = getLastModifiedFor("public/llms.txt");
  const posts = await getCachedPublicBlogPosts();

  return [
    {
      url: SITE_URL,
      lastModified: homeLastModified,
      changeFrequency: "daily",
      priority: 1,
      images: [SITE_OG_IMAGE],
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: privacyLastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms-of-service`,
      lastModified: termsLastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/news`,
      lastModified: blogLastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/support`,
      lastModified: supportLastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/llms.txt`,
      lastModified: llmsLastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    ...posts.map((post) => ({
      url: `${SITE_URL}/news/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.55,
    })),
  ];
}
