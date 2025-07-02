import { CHOPSTICKS_URL } from "@/constants";
import { FormEvent } from "react";
import { ReactSVG } from "react-svg";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import logo from "./chopsticks.svg";
import { useControllerAction } from "./controllerAction";
import { ControllerStatusIndicator } from "./ControllerStatusIndicator";

export const ChopsticksController = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" forceSvgSize={false}>
          <ReactSVG
            src={logo}
            beforeInjection={(svg) => {
              svg.setAttribute("width", String(24));
              svg.setAttribute("height", String(24));
            }}
          />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chopsticks operations</DialogTitle>
        </DialogHeader>
        <ApproveReferendum />
        <TreasurySpend />
        <ResetBalance />
      </DialogContent>
    </Dialog>
  );
};

const ApproveReferendum = () => {
  const { handler, status } = useControllerAction(
    (evt: FormEvent<HTMLFormElement>) =>
      fetch(
        CHOPSTICKS_URL +
          "/approve_referendum/" +
          evt.currentTarget.number.value,
      ),
  );

  return (
    <div>
      <h3 className="text-sm font-bold">Approve Referendum</h3>
      <form onSubmit={handler}>
        <div className="flex items-center gap-2">
          <Input name="number" type="number" placeholder="Referendum Number" />
          <Input className="shrink-0 w-auto" type="submit" value="Approve" />
          <ControllerStatusIndicator status={status} />
        </div>
      </form>
    </div>
  );
};

const TreasurySpend = () => {
  const { handler, status } = useControllerAction(() =>
    fetch(CHOPSTICKS_URL + "/treasury_spend"),
  );

  return (
    <div>
      <h3 className="text-sm font-bold">Jump to next treasury spend</h3>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handler}>
          Jump
        </Button>
        <ControllerStatusIndicator status={status} />
      </div>
    </div>
  );
};

const ResetBalance = () => {
  const { handler, status } = useControllerAction(
    (evt: FormEvent<HTMLFormElement>) =>
      fetch(
        CHOPSTICKS_URL + "/reset_balance/" + evt.currentTarget.address.value,
      ),
  );

  return (
    <div>
      <h3 className="text-sm font-bold">Reset balance of account</h3>
      <form onSubmit={handler}>
        <div className="flex items-center gap-2">
          <Input name="address" placeholder="Address" />
          <Input className="shrink-0 w-auto" type="submit" value="Reset" />
          <ControllerStatusIndicator status={status} />
        </div>
      </form>
    </div>
  );
};
