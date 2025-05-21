import { USE_CHOPSTICKS } from "@/chain";
import { ChopsticksController } from "./ChopsticksController";
import { SelectAccount } from "./SelectAccount";

export const Header = () => {
  return (
    <div className="max-w-5xl flex items-center m-auto justify-between">
      <h1 className="text-xl font-bold">RFP Launcher</h1>
      <div className="flex items-center gap-2">
        {USE_CHOPSTICKS ? <ChopsticksController /> : null}
        <SelectAccount />
      </div>
    </div>
  );
};
