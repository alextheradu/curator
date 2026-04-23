import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn, normalizeAssistantMarkdown } from "@/lib/utils";

interface BlogMarkdownProps {
  content: string;
  className?: string;
}

export function BlogMarkdown({ content, className }: BlogMarkdownProps) {
  return (
    <div className={cn("text-[14px] leading-6 text-foreground sm:text-[15px] sm:leading-7", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const isBlock = Boolean(className?.match(/language-(\w+)/));

            return isBlock ? (
              <pre className="my-4 overflow-x-auto rounded-[1rem] border border-border/50 bg-black/30 p-3 text-[12px] leading-5 sm:rounded-[1.25rem] sm:p-4 sm:text-[13px] sm:leading-6">
                <code className={className} {...props}>
                  {String(children).replace(/\n$/, "")}
                </code>
              </pre>
            ) : (
              <code className="rounded-md bg-muted px-1.5 py-0.5 text-[13px]" {...props}>
                {children}
              </code>
            );
          },
          p: ({ children }) => <p className="mb-3.5 last:mb-0 sm:mb-4">{children}</p>,
          ul: ({ children }) => <ul className="mb-3.5 list-disc pl-4.5 sm:mb-4 sm:pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3.5 list-decimal pl-4.5 sm:mb-4 sm:pl-5">{children}</ol>,
          li: ({ children }) => <li className="mb-1.5">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mb-3 mt-6 text-2xl font-semibold tracking-tight first:mt-0 sm:mt-8 sm:text-3xl">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-6 text-[1.45rem] font-semibold tracking-tight first:mt-0 sm:mt-8 sm:text-2xl">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-5 text-lg font-semibold tracking-tight first:mt-0 sm:mt-6 sm:text-xl">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-r-[0.9rem] border-l-2 border-[#0066B3]/70 bg-[#0066B3]/[0.06] px-3 py-2.5 text-[13px] leading-6 text-muted-foreground sm:rounded-r-[1rem] sm:px-4 sm:py-3 sm:text-inherit sm:leading-inherit">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-[1rem] border border-border/60 sm:rounded-[1.25rem]">
              <table className="min-w-full border-collapse text-[12px] sm:text-[13px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border/60 bg-white/[0.04] px-2.5 py-2 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:px-3 sm:text-[11px]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border/50 px-2.5 py-2 align-top sm:px-3">{children}</td>
          ),
          hr: () => <hr className="my-6 border-border/60" />,
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-[#8cc6f3] underline underline-offset-2 hover:opacity-80"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {normalizeAssistantMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}
