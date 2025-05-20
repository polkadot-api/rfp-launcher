import { Circle, CircleCheck, CircleX } from "lucide-react";
import { FC } from "react";
import { Spinner } from "../Spinner";
import { ControllerStatus } from "./controllerAction";

export const ControllerStatusIndicator: FC<{ status: ControllerStatus }> = ({
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
