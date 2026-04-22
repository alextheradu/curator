import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export function LazyCodeBlock({ language, children }: { language: string; children: string }) {
  return (
    <SyntaxHighlighter
      style={oneDark}
      language={language}
      PreTag="div"
      className="!my-3 !rounded-xl !border !border-border/30 !text-xs"
    >
      {children}
    </SyntaxHighlighter>
  );
}
