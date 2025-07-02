import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import {
  concat,
  endWith,
  map,
  merge,
  NEVER,
  Observable,
  takeUntil,
} from "rxjs";
import { FormSchema } from "../RfpForm/formSchema";

export const [dismiss$, dismiss] = createSignal<void>();
export const [formDataChange$, submit] = createSignal<FormSchema>();
export const submittedFormData$ = state(
  merge(formDataChange$, dismiss$.pipe(map(() => null))),
  null,
);

/**
 * Operator that prevents completion of the stream until it has been dismissed.
 * It will end with a "null" emission (to help reset state).
 */
export const dismissable =
  <T>() =>
  (source$: Observable<T>) =>
    concat(source$, NEVER).pipe(takeUntil(dismiss$), endWith(null));
