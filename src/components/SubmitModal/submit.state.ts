import { typedApi } from "@/chain";
import { createReferendaSdk } from "@polkadot-api/sdk-governance";
import { state } from "@react-rxjs/core";
import { combineLatest, map } from "rxjs";
import { bountyCreationProcess$, bountyCreationTx$ } from "./tx/bountyCreation";
import {
  referendumCreationProcess$,
  referendumCreationTx$,
} from "./tx/referendumCreation";

const referendaSdk = createReferendaSdk(typedApi);

export const activeTxStep$ = state(
  combineLatest([
    bountyCreationTx$,
    bountyCreationProcess$,
    referendumCreationTx$,
    referendumCreationProcess$,
  ]).pipe(
    map(([bountyTx, bountyProcess, referendumTx, referendumProcess]) => {
      if (referendumProcess) {
        if (referendumProcess.type === "finalized" && referendumProcess.ok) {
          const referendum =
            referendaSdk.getSubmittedReferendum(referendumProcess);
          return {
            type: "refDone" as const,
            value: {
              txEvent: referendumProcess,
              referendum,
            },
          };
        }
        if (
          referendumProcess.type !== "error" ||
          referendumProcess.err.message !== "Cancelled"
        ) {
          return {
            type: "refSubmitting" as const,
            value: {
              txEvent: referendumProcess,
            },
          };
        }
      }
      if (referendumTx) {
        return {
          type: "refTx" as const,
          value: {
            ...referendumTx,
          },
        };
      }

      if (bountyProcess) {
        if (
          bountyProcess.type !== "error" ||
          bountyProcess.err.message !== "Cancelled"
        ) {
          return {
            type: "bountySubmitting" as const,
            value: {
              txEvent: bountyProcess,
            },
          };
        }
      }

      return bountyTx
        ? {
            type: "bountyTx" as const,
            value: {
              ...bountyTx,
            },
          }
        : null;
    })
  ),
  null
);
