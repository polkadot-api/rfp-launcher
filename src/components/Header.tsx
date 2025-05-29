import { USE_CHOPSTICKS } from "@/chain"
import { ChopsticksController } from "./ChopsticksController"
import { SelectAccount } from "./SelectAccount"

export const Header = () => {
  return (
    <header className="poster-header">
      <div className="poster-header-content">
        <div className="poster-brand">
          <h1 className="poster-brand-title">RFP Launcher</h1>
          <div className="poster-brand-subtitle">kusama proposal toolkit</div>
        </div>

        <div className="poster-actions">
          <SelectAccount />
          <div className="kusama-stamp">KUSAMA</div>
          {USE_CHOPSTICKS && <ChopsticksController />}
        </div>
      </div>
    </header>
  )
}

