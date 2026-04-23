import { getCachedPublicBlogPosts } from "@/lib/blog";
import { MainLayout } from "@/components/MainLayout";

export default async function MainGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const posts = await getCachedPublicBlogPosts();
  const latest = posts[0];
  const latestNewsPublishedAt =
    latest?.publishedAt?.toISOString() ?? latest?.createdAt?.toISOString() ?? null;

  return (
    <MainLayout latestNewsPublishedAt={latestNewsPublishedAt}>
      {children}
    </MainLayout>
  );
}
