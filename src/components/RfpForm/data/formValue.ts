import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { DeepPartial } from "react-hook-form";
import { FormSchema } from "../formSchema";
import { merge } from "rxjs";
import { formDataChange$ } from "@/components/SubmitModal/modalActions";

// Observable of the form value as it's something needed throughout different derived state.
export const [formChange$, setFormValue] =
  createSignal<DeepPartial<FormSchema>>();
export const formValue$ = state(merge(formChange$, formDataChange$), {});
