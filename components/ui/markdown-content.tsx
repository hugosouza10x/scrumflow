import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={[
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5",
        "prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1",
        "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs",
        "prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-md prose-pre:text-xs",
        "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
