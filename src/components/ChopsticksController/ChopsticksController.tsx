import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { ReactSVG } from "react-svg";
import logo from "./chopsticks.svg";
import { FC, FormEvent, useState } from "react";
import { Spinner } from "../Spinner";
import { Circle, CircleCheck, CircleX } from "lucide-react";

export const ChopsticksController = () => {
  return (
    <Dialog>
      <DialogTrigger>
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

const CONTROLLER_URL = `http://localhost:8133`;
type ControllerStatus = null | "loading" | "success" | "error";
const useControllerAction = <T extends FormEvent | MouseEvent>(
  action: (evt: T) => Promise<Response>
) => {
  const [status, setStatus] = useState<ControllerStatus>(null);

  return {
    status,
    handler: (evt: T) => {
      evt.preventDefault();

      setStatus("loading");
      action(evt)
        .then((res) => res.json())
        .then(
          (res) => {
            console.log(res);
            setStatus("success");
          },
          (err) => {
            console.error(err);
            setStatus("error");
          }
        );
    },
  };
};

const ControllerStatusIndicator: FC<{ status: ControllerStatus }> = ({
  status,
}) =>
  !status ? (
    <Circle className="shrink-0 text-foreground/30" />
  ) : status === "loading" ? (
    <Spinner className="shrink-0" />
  ) : status === "success" ? (
    <CircleCheck className="shrink-0 text-green-600" />
  ) : (
    <CircleX className="shrink-0 text-red-600" />
  );

const ApproveReferendum = () => {
  const { handler, status } = useControllerAction(
    (evt: FormEvent<HTMLFormElement>) =>
      fetch(
        CONTROLLER_URL + "/approve_referendum/" + evt.currentTarget.number.value
      )
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
    fetch(CONTROLLER_URL + "/treasury_spend")
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
        CONTROLLER_URL + "/reset_balance/" + evt.currentTarget.address.value
      )
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
