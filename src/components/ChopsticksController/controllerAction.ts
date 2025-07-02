import { FormEvent, useState } from "react";

export type ControllerStatus = null | "loading" | "success" | "error";
export const useControllerAction = <T extends FormEvent | MouseEvent>(
  action: (evt: T) => Promise<Response>,
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
          },
        );
    },
  };
};
