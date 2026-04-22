import type { Metadata } from "next";
import Link from "next/link";
import { readPublicMarkdown } from "@/lib/markdown";
import { buildPublicPageMetadata } from "@/lib/seo";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Privacy Policy",
  description:
    "Read Curator's privacy policy, including data collection, retention, third-party services, search indexing notifications, and user rights.",
  path: "/privacy-policy",
});

export default async function PrivacyPage() {
  const content = await readPublicMarkdown("privacy-policy.md");
  return (
    <div className="min-h-screen bg-[#0f0f0f] px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 inline-block text-sm text-[#0066B3] hover:underline">← Back to Curator</Link>
        <article className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
