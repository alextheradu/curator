import { readPublicMarkdown } from "@/lib/markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata = { title: "Terms of Service — Curator" };

export default async function TermsPage() {
  const content = await readPublicMarkdown("terms-of-service.md");
  return (
    <div className="min-h-screen bg-[#0f0f0f] px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="mb-8 inline-block text-sm text-[#0066B3] hover:underline">← Back to Curator</a>
        <article className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
