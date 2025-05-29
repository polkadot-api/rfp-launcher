import type { FC } from "react"

export const WelcomeSection: FC = () => (
  <div className="poster-card relative overflow-hidden">
    <div
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage: "url('/rocket.jpg?height=400&width=1200')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "blur(2px) saturate(0.95)",
        mixBlendMode: "multiply",
      }}
    />

    {/* Content overlay */}
    <div className="relative z-10 max-w-2xl">
      <h2 className="text-4xl font-medium mb-6 text-midnight-koi">Launch your request for proposal</h2>

      <div className="space-y-4 text-lg leading-relaxed text-pine-shadow">
        <p>
          This tool guides you through creating an RFP (request for proposal).
        </p>
        <p>
          After completing the form, you'll submit three transactions to set up the RFP. Then we'll provide a
          pre-formatted body for your referendum.
        </p>
      </div>

      <div className="mt-8 text-sm text-pine-shadow-60">Grab some lemonade and let's get started.</div>
    </div>
  </div>
)

