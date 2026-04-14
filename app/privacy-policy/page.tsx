import { readPublicMarkdown } from "@/lib/markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata = { title: "Privacy Policy — Curator" };

export default async function PrivacyPage() {
  const content = await readPublicMarkdown("privacy-policy.md");
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
