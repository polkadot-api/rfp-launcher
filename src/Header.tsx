import { SelectAccount } from "./components/SelectAccount/SelectAccount";

export const Header = () => {
  return (
    <div className="max-w-5xl flex items-center m-auto justify-between">
      <h1 className="text-xl font-bold">RFP Launcher</h1>
      <div>
        <SelectAccount />
      </div>
    </div>
  );
};
