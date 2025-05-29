"use client"

import type React from "react"
import { useState } from "react"
import { Eye, Code } from "lucide-react"
import { Textarea } from "../ui/textarea"

interface MarkdownPreviewProps {
  markdown: string
  onCopy: () => void
  copied: boolean
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown, onCopy, copied }) => {
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
          <MarkdownRenderer content={markdown} />
        </div>
      ) : (
        <div className="border border-pine-shadow-20 rounded-b-lg">
          <Textarea
            readOnly
            value={markdown || "Loading Markdown preview..."}
            className="w-full min-h-[300px] font-mono text-sm border-0 rounded-b-lg resize-none"
            style={{
              fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
              borderRadius: "0 0 0.5rem 0.5rem",
            }}
            placeholder="Markdown preview will appear here..."
          />
        </div>
      )}
    </div>
  )
}

// Simple markdown renderer component with normal fonts
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) {
    return <div className="text-pine-shadow-60 italic text-sm">Loading Markdown preview...</div>
  }

  // Simple markdown parsing
  const parseMarkdown = (text: string) => {
    const lines = text.split("\n")
    const elements: React.ReactNode[] = []
    let currentList: string[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc pl-5 mb-4 space-y-1">
            {currentList.map((item, i) => (
              <li key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: parseInline(item) }} />
            ))}
          </ul>,
        )
        currentList = []
      }
    }

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        elements.push(
          <pre
            key={`code-${elements.length}`}
            className="bg-gray-100 p-4 rounded border-l-4 border-lake-haze mb-4 overflow-x-auto"
            style={{ fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace' }}
          >
            <code className="text-sm text-gray-800">{codeBlockContent.join("\n")}</code>
          </pre>,
        )
        codeBlockContent = []
      }
    }

    lines.forEach((line, index) => {
      // Handle code blocks
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          flushCodeBlock()
          inCodeBlock = false
        } else {
          flushList()
          inCodeBlock = true
        }
        return
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        return
      }

      // Handle headers
      if (line.startsWith("# ")) {
        flushList()
        elements.push(
          <h1
            key={index}
            className="text-2xl font-bold mb-4 text-gray-900 leading-tight"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            {line.slice(2)}
          </h1>,
        )
      } else if (line.startsWith("## ")) {
        flushList()
        elements.push(
          <h2
            key={index}
            className="text-xl font-semibold mb-3 text-gray-900 leading-tight"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            {line.slice(3)}
          </h2>,
        )
      } else if (line.startsWith("### ")) {
        flushList()
        elements.push(
          <h3
            key={index}
            className="text-lg font-semibold mb-2 text-gray-900 leading-tight"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            {line.slice(4)}
          </h3>,
        )
      }
      // Handle list items
      else if (line.startsWith("- ")) {
        currentList.push(line.slice(2))
      }
      // Handle paragraphs
      else if (line.trim()) {
        flushList()
        elements.push(
          <p
            key={index}
            className="mb-4 text-sm leading-relaxed text-gray-700"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
            dangerouslySetInnerHTML={{ __html: parseInline(line) }}
          />,
        )
      }
      // Handle empty lines
      else {
        flushList()
        if (elements.length > 0) {
          elements.push(<div key={index} className="mb-3" />)
        }
      }
    })

    flushList()
    flushCodeBlock()
    return elements
  }

  const parseInline = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>')
      .replace(
        /`(.*?)`/g,
        "<code class=\"bg-gray-100 px-2 py-1 rounded text-sm\" style=\"font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;\">$1</code>",
      )
  }

  return (
    <div className="prose prose-sm max-w-none" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {parseMarkdown(content)}
    </div>
  )
}

