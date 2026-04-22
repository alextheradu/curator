import type { Metadata } from "next";
import Link from "next/link";
import { SupportForm } from "@/components/support/SupportForm";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Support",
  description:
    "Contact the Curator operator for bug reports, feature requests, account issues, privacy questions, and general support.",
  path: "/support",
  keywords: [
    "Curator support",
    "FRC support",
    "Curator bug report",
    "Curator feature request",
    "FRC AI support",
    "Curator privacy request",
  ],
});

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <Link href="/" className="mb-8 inline-block text-sm text-[#0066B3] hover:underline">
            ← Back to Curator
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Support</h1>
          <p className="mt-2 text-[14px] leading-7 text-muted-foreground">
            Use this form for bugs, feature requests, account problems, and privacy questions.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-border/60 bg-card/80 p-6 shadow-[var(--shadow-card)]">
          <SupportForm />
        </div>

        <div className="flex gap-6 text-[13px] text-muted-foreground">
          <Link href="/privacy-policy" className="text-[#0066B3] hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms-of-service" className="text-[#0066B3] hover:underline">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
