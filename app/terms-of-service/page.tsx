import type { Metadata } from "next";
import Link from "next/link";
import { readPublicMarkdown } from "@/lib/markdown";
import { buildPublicPageMetadata } from "@/lib/seo";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Terms of Service",
  description:
    "Read Curator's terms of service, including acceptable use, accounts, shared chats, search indexing notifications, and service limitations.",
  path: "/terms-of-service",
});

export default async function TermsPage() {
  const content = await readPublicMarkdown("terms-of-service.md");
  return (
    <div className="h-svh overflow-y-auto bg-[#0f0f0f] px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 inline-block text-sm text-[#0066B3] hover:underline">← Back to Curator</Link>
        <article className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
