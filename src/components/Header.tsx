import { USE_CHOPSTICKS } from "@/chain";
import { ChopsticksController } from "./ChopsticksController";
import { SelectAccount } from "./SelectAccount";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { KnownChains, matchedChain } from "@/chainRoute";

export const Header = () => {
  return (
    <header className="poster-header">
      <div className="poster-header-content">
        {/* This div is now the flex-row container for the logo and the text block */}
        <div className="flex flex-row items-center gap-3">
          <img
            src={import.meta.env.BASE_URL + "logo.svg"}
            alt="RFP Launcher Logo"
            className="h-14 w-auto"
          />
          <div className="poster-brand">
            <h1 className="poster-brand-title">RFP Launcher</h1>
            <div className="poster-brand-subtitle">Proposal Toolkit</div>
          </div>
        </div>

        <div className="poster-actions">
          <SelectAccount />
          <ChainSelector />
          {USE_CHOPSTICKS && <ChopsticksController />}
        </div>
      </div>
    </header>
  );
};

const chainNames: Record<KnownChains, string> = {
  kusama: "Kusama",
  polkadot: "Polkadot",
};

const ChainSelector = () => (
  <Select
    value={matchedChain}
    onValueChange={(v) => {
      window.location.href = "?chain=" + v;
    }}
  >
    <SelectTrigger className="w-auto kusama-stamp">
      <SelectValue aria-label={matchedChain}>
        {chainNames[matchedChain]}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {Object.entries(chainNames).map(([key, value]) => (
        <SelectItem key={key} value={key}>
          {value}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
