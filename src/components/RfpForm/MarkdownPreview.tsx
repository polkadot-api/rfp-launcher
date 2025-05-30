"use client"

import React from "react" // Ensure React is imported for JSX
import { useState } from "react"
import { Eye, Code } from "lucide-react"
import { Textarea } from "../ui/textarea"
import ReactMarkdown from "react-markdown"
import type { Components, ExtraProps } from "react-markdown" // For typing custom components

// Define styles (can be moved to a separate file or kept here)
const baseTextStyles = "font-['IBM_Plex_Sans',_system-ui,_sans-serif] text-pine-shadow-90 leading-relaxed"
const headingStyles = "font-['Cooper_Hewitt',_Georgia,_serif] text-midnight-koi font-medium"
const codeStyles = "font-['IBM_Plex_Mono',_monospace] bg-pine-shadow-10 text-midnight-koi p-1 rounded text-sm" // Base for inline and block code text
const preStyles = "bg-pine-shadow-10 rounded my-4 p-0 overflow-x-auto" // For <pre> tag

// Explicit type for code component props
interface CodeProps extends React.HTMLAttributes<HTMLElement>, ExtraProps {
  inline?: boolean
  // className might be present for language specification in fenced code blocks
  className?: string
  children?: React.ReactNode
}

const customComponents: Components = {
  h1: ({ node: _node, ...props }) => <h1 className={`${headingStyles} text-3xl mb-4 mt-6`} {...props} />,
  h2: ({ node: _node, ...props }) => <h2 className={`${headingStyles} text-2xl mb-3 mt-5`} {...props} />,
  h3: ({ node: _node, ...props }) => <h3 className={`${headingStyles} text-xl mb-2 mt-4`} {...props} />,
  h4: ({ node: _node, ...props }) => <h4 className={`${headingStyles} text-lg mb-2 mt-3`} {...props} />,
  p: ({ node: _node, ...props }) => <p className={`${baseTextStyles} mb-4`} {...props} />,
  ul: ({ node: _node, ...props }) => <ul className={`${baseTextStyles} list-disc pl-5 mb-4`} {...props} />,
  ol: ({ node: _node, ...props }) => <ol className={`${baseTextStyles} list-decimal pl-5 mb-4`} {...props} />,
  li: ({ node: _node, children, ...props }) => {
    const firstChildIsP = React.Children.toArray(children).some(
      (child) => React.isValidElement(child) && child.type === "p",
    )
    return (
      <li className={`${baseTextStyles} ${firstChildIsP ? "" : "mb-1"}`} {...props}>
        {children}
      </li>
    )
  },
  a: ({ node: _node, ...props }) => <a className="text-tomato-stamp hover:text-midnight-koi underline" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-semibold text-midnight-koi" {...props} />,
  em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
  code: ({ node: _node, inline, className, children, ...props }: CodeProps) => {
    if (inline) {
      return (
        <code className={`${codeStyles} px-1 py-0.5`} {...props}>
          {children}
        </code>
      )
    }
    // For block code, it's rendered inside a <pre> by default.
    // We style the <code> tag here. The <pre> tag is styled by its own custom component.
    return (
      <code className={`${codeStyles} block whitespace-pre-wrap p-2 ${className || ""}`} {...props}>
        {String(children).replace(/\n$/, "")}
      </code>
    )
  },
  pre: ({ node: _node, children, ...props }) => {
    return (
      <pre className={preStyles} {...props}>
        {children}
      </pre>
    )
  },
}

interface MarkdownPreviewProps {
  markdown: string
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown }) => {
  const [activeTab, setActiveTab] = useState<"rendered" | "raw">("rendered")

  const handleTabClick = (tab: "rendered" | "raw", event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setActiveTab(tab)
  }

  return (
    <div className="markdown-preview">
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
          {markdown ? (
            <ReactMarkdown components={customComponents}>{markdown}</ReactMarkdown>
          ) : (
            <div className="text-pine-shadow-60 italic text-sm">Loading Markdown preview...</div>
          )}
        </div>
      ) : (
        <div className="border border-pine-shadow-20 rounded-b-lg">
          <Textarea
            readOnly
            value={markdown || "Loading Markdown preview..."}
            className="w-full min-h-[300px] font-mono text-sm border-0 rounded-b-lg resize-none"
            style={{
              fontFamily: "var(--font-mono)", // Use CSS variable for consistency
              borderRadius: "0 0 0.5rem 0.5rem",
            }}
            placeholder="Markdown preview will appear here..."
          />
        </div>
      )}
    </div>
  )
}

