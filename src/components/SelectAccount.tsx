import { state, useStateObservable, withDefault } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import {
  connectInjectedExtension,
  getInjectedExtensions,
  InjectedExtension,
  InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import { useState } from "react";
import {
  catchError,
  concat,
  defer,
  filter,
  fromEventPattern,
  interval,
  map,
  NEVER,
  of,
  retry,
  startWith,
  switchMap,
  take,
  tap,
  timer,
} from "rxjs";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const availableExtensions$ = state(
  concat(
    timer(0, 100).pipe(
      map(getInjectedExtensions),
      filter((v) => v.length > 0),
      take(1)
    ),
    interval(2000).pipe(map(getInjectedExtensions))
  ),
  []
);

const [selectExtension$, selectExtension] = createSignal<string>();
const selectedExtension$ = state(
  selectExtension$.pipe(
    switchMap((name) => {
      const connect$ = defer(() => connectInjectedExtension(name)).pipe(
        // PolkadotJS rejects the promise straight away instead of waiting for user input
        retry({
          delay(error) {
            if (error?.message.includes("pending authorization request")) {
              return timer(1000);
            }
            throw error;
          },
        })
      );

      let disconnected = false;
      let extension: InjectedExtension | null = null;
      return concat(connect$, NEVER).pipe(
        catchError((err) => {
          console.error(err);
          return of(null);
        }),
        tap({
          next(value) {
            if (value) {
              if (disconnected) {
                value.disconnect();
              } else {
                extension = value;
              }
            }
          },
          unsubscribe() {
            if (extension) {
              extension.disconnect();
            } else {
              disconnected = true;
            }
          },
        })
      );
    })
  ),
  null
);

const extensionAccounts$ = selectedExtension$.pipeState(
  switchMap((extension) => {
    if (!extension) return [null];
    const initialAccounts = extension.getAccounts();

    return fromEventPattern<InjectedPolkadotAccount[]>(
      (handler) => extension.subscribe(handler),
      (_, signal) => signal()
    ).pipe(startWith(initialAccounts));
  }),
  withDefault(null)
);

export const SelectAccount = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Connect</Button>
      </DialogTrigger>
      <SelectAccountContent />
    </Dialog>
  );
};

const SelectAccountContent = () => {
  const availableExtensions = useStateObservable(availableExtensions$);
  const selectedExtension = useStateObservable(selectedExtension$);
  const extensionAccounts = useStateObservable(extensionAccounts$);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Connect</DialogTitle>
        <DialogDescription>
          Connect using one of the polkadot extensions
        </DialogDescription>
      </DialogHeader>
      <ul>
        {availableExtensions.map((v) => (
          <li key={v}>
            <button
              className={selectedExtension?.name === v ? "bg-slate-200" : ""}
              onClick={() => selectExtension(v)}
            >
              {v}
            </button>
          </li>
        ))}
      </ul>
      {extensionAccounts ? (
        <ul>
          {extensionAccounts.map((account) => (
            <li key={account.address}>
              {account.name} {account.address}
            </li>
          ))}
        </ul>
      ) : null}
    </DialogContent>
  );
};
