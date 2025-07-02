import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import {
  connectInjectedExtension,
  getInjectedExtensions,
  InjectedExtension,
} from "polkadot-api/pjs-signer";
import {
  catchError,
  concat,
  defer,
  distinctUntilChanged,
  filter,
  interval,
  map,
  merge,
  NEVER,
  of,
  retry,
  switchMap,
  take,
  tap,
  timer,
} from "rxjs";

export const availableExtensions$ = state(
  concat(
    timer(0, 100).pipe(
      map(getInjectedExtensions),
      filter((v) => v.length > 0),
      take(1),
    ),
    interval(2000).pipe(map(getInjectedExtensions)),
  ),
  [],
);

const getPersistedSelectedExtension = () =>
  localStorage.getItem("selected-extension");
const setPersistedSelectedExtension = (value: string) =>
  localStorage.setItem("selected-extension", value);

export const [selectExtension$, selectExtension] = createSignal<string>();
export const selectedExtension$ = state(
  merge(
    availableExtensions$.pipe(
      filter((v) => v.includes(getPersistedSelectedExtension()!)),
      map(() => getPersistedSelectedExtension()!),
      distinctUntilChanged(),
    ),
    selectExtension$.pipe(tap(setPersistedSelectedExtension)),
  ).pipe(
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
        }),
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
        }),
      );
    }),
  ),
  null,
);
