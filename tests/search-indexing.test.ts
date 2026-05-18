import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/blog", () => ({
  getCachedPublicBlogPost: vi.fn(async () => ({
    slug: "release-notes",
    title: "Release notes",
    summary: "Product update.",
  })),
  getCachedPublicBlogPosts: vi.fn(async () => [
    {
      slug: "release-notes",
      updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  ]),
}));

describe("search indexing", () => {
  it("keeps news pages out of the generated sitemap", async () => {
    const { default: sitemap } = await import("@/app/sitemap");

    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);

    expect(paths).not.toContain("/news");
    expect(paths).not.toContain("/news/release-notes");
    expect(paths).toContain("/");
    expect(paths).toContain("/support");
  });

  it("marks news pages as noindex", async () => {
    const [{ NO_INDEX_ROBOTS }, { metadata }, { generateMetadata }] = await Promise.all([
      import("@/lib/seo"),
      import("@/app/(main)/news/page"),
      import("@/app/(main)/news/[slug]/page"),
    ]);

    await expect(generateMetadata({ params: Promise.resolve({ slug: "release-notes" }) })).resolves.toMatchObject({
      robots: NO_INDEX_ROBOTS,
    });
    expect(metadata).toMatchObject({ robots: NO_INDEX_ROBOTS });
  });

  it("does not submit news or legacy blog URLs to IndexNow", async () => {
    vi.resetModules();
    process.env.INDEXNOW_KEY = "test-key";
    process.env.NEXT_PUBLIC_SITE_URL = "https://curatorfrc.com";
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { submitIndexNowUrls } = await import("@/lib/indexnow");

    const result = await submitIndexNowUrls([
      "/",
      "/support",
      "/news",
      "/news/release-notes",
      "/blog",
      "/blog/release-notes",
    ]);

    expect(result.ok).toBe(true);
    expect(result.submitted.map((url) => new URL(url).pathname)).toEqual(["/", "/support"]);

    vi.unstubAllGlobals();
    delete process.env.INDEXNOW_KEY;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("treats encoded excluded paths as non-indexable", async () => {
    const { isSearchIndexablePath } = await import("@/lib/seo");

    expect(isSearchIndexablePath("/c%2F11111111-1111-4111-8111-111111111111")).toBe(false);
    expect(isSearchIndexablePath("/%63/11111111-1111-4111-8111-111111111111")).toBe(false);
    expect(isSearchIndexablePath("/api%2Fchat")).toBe(false);
    expect(isSearchIndexablePath("/support")).toBe(true);
  });
});
