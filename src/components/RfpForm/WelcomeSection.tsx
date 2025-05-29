import type { FC } from "react"

export const WelcomeSection: FC = () => (
  <div className="poster-card relative overflow-hidden">
    {/* Hero background - lakeside pier with 60% blur */}
    <div
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage: "url('/placeholder.svg?height=400&width=1200')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "blur(8px) saturate(0.7)",
        mixBlendMode: "multiply",
      }}
    />

    {/* Content overlay */}
    <div className="relative z-10 max-w-2xl">
      <h2 className="text-4xl font-medium mb-6 text-midnight-koi">launch your request for proposal</h2>

      <div className="space-y-4 text-lg leading-relaxed text-pine-shadow">
        <p>
          this tool guides you through creating an rfp on kusama. think of it as your lakeside productivity companion —
          technically working, but with bare feet on the dock.
        </p>
        <p>
          after completing the form, you'll submit three transactions to set up the rfp. then we'll provide a
          pre-formatted body for your referendum.
        </p>
      </div>

      <div className="mt-8 text-sm text-pine-shadow-60">grab some lemonade and let's get started.</div>
    </div>
  </div>
)

