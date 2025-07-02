"use client";

import React from "react";
import { useState } from "react";
import { Eye, Code } from "lucide-react";
import { Textarea } from "../ui/textarea";
import ReactMarkdown, { type Components } from "react-markdown";
import { cn } from "@/lib/utils"; // For combining class names

interface MarkdownPreviewProps {
  markdown: string;
}

// Define a base style for standard text elements
const baseTextStyles =
  "font-['system-ui','-apple-system','BlinkMacSystemFont','Segoe_UI','Roboto','Helvetica_Neue','Arial','Noto_Sans','sans-serif','Apple_Color_Emoji','Segoe_UI_Emoji','Segoe_UI_Symbol','Noto_Color_Emoji'] text-pine-shadow-90 leading-relaxed";
const headingStyles = `${baseTextStyles} text-midnight-koi font-semibold mt-6 mb-3`;
const codeStyles =
  "font-mono bg-pine-shadow-10 text-midnight-koi px-1 py-0.5 rounded text-sm";

const customComponents: Components = {
  h1: ({ node, ...props }) => (
    <h1
      className={cn(
        headingStyles,
        "text-3xl border-b border-pine-shadow-20 pb-2 mb-4",
      )}
      {...props}
    />
  ),
  h2: ({ node, ...props }) => (
    <h2
      className={cn(
        headingStyles,
        "text-2xl border-b border-pine-shadow-20 pb-1 mb-3",
      )}
      {...props}
    />
  ),
  h3: ({ node, ...props }) => (
    <h3 className={cn(headingStyles, "text-xl")} {...props} />
  ),
  h4: ({ node, ...props }) => (
    <h4 className={cn(headingStyles, "text-lg")} {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className={cn(baseTextStyles, "mb-4")} {...props} />
  ),
  a: ({ node, ...props }) => (
    <a
      className="text-tomato-stamp hover:text-midnight-koi underline"
      {...props}
    />
  ),
  ul: ({ node, ...props }) => (
    <ul
      className={cn(baseTextStyles, "list-disc pl-6 mb-4 space-y-1")}
      {...props}
    />
  ),
  ol: ({ node, ...props }) => (
    <ol
      className={cn(baseTextStyles, "list-decimal pl-6 mb-4 space-y-1")}
      {...props}
    />
  ),
  li: ({ node, children, ...props }) => {
    // Check if the li contains a p, if so, don't add margin to li itself
    const hasParagraph = React.Children.toArray(children).some(
      (child) => React.isValidElement(child) && child.type === "p",
    );
    return (
      <li
        className={cn(baseTextStyles, !hasParagraph ? "mb-1" : "")}
        {...props}
      >
        {children}
      </li>
    );
  },
  code: ({ node, className, children, ...props }) => {
    return (
      <code className={cn(codeStyles, className)} {...props}>
        {children}
      </code>
    );
  },
  blockquote: ({ node, ...props }) => (
    <blockquote
      className={cn(
        baseTextStyles,
        "border-l-4 border-lake-haze pl-4 italic my-4 text-pine-shadow-60",
      )}
      {...props}
    />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-midnight-koi" {...props} />
  ),
  em: ({ node, ...props }) => <em className="italic" {...props} />,
  hr: ({ node, ...props }) => (
    <hr className="border-pine-shadow-20 my-6" {...props} />
  ),
  // You can add more custom components for other elements like table, img, etc.
};

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  markdown,
}) => {
  const [activeTab, setActiveTab] = useState<"rendered" | "raw">("rendered");

  const handleTabClick = (tab: "rendered" | "raw", event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveTab(tab);
  };

  return (
    <div className="markdown-preview">
      {" "}
      {/* Keep this outer wrapper for its existing styles */}
      {/* Tab Headers */}
      <div className="markdown-tabs">
        <button
          type="button"
          className={`markdown-tab ${activeTab === "rendered" ? "active" : ""}`}
          onClick={(e) => handleTabClick("rendered", e)}
        >
          <Eye size={14} className="inline mr-1" />
          Preview
        </button>
        <button
          type="button"
          className={`markdown-tab ${activeTab === "raw" ? "active" : ""}`}
          onClick={(e) => handleTabClick("raw", e)}
        >
          <Code size={14} className="inline mr-1" />
          Raw Markdown
        </button>
      </div>
      {/* Tab Content */}
      {activeTab === "rendered" ? (
        <div className="p-6 bg-canvas-cream border border-pine-shadow-20 rounded-b-lg">
          <div className="max-w-none">
            {markdown ? (
              <ReactMarkdown components={customComponents}>
                {markdown}
              </ReactMarkdown>
            ) : (
              <div
                className={cn(
                  baseTextStyles,
                  "text-pine-shadow-60 italic text-sm",
                )}
              >
                Loading Markdown preview...
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-pine-shadow-20 rounded-b-lg">
          <Textarea
            readOnly
            value={markdown || "Loading Markdown preview..."}
            className="w-full min-h-[300px] font-mono text-sm border-0 rounded-b-lg resize-none"
            style={{
              fontFamily: "var(--font-mono)",
              borderRadius: "0 0 0.5rem 0.5rem",
            }}
            placeholder="Markdown preview will appear here..."
          />
        </div>
      )}
    </div>
  );
};
