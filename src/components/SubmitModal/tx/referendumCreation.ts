import { referendaSdk, typedApi } from "@/chain";
import { curatorDeposit$ } from "@/components/RfpForm/data/estimatedTxCost";
import {
  formatTrackName,
  getTrack,
} from "@/components/RfpForm/data/referendaConstants";
import { referendumExecutionBlocks$ } from "@/components/RfpForm/data/timeline";
import { formatToken } from "@/lib/formatToken";
import { accId } from "@/lib/ss58";
import { MultiAddress } from "@polkadot-api/descriptors";
import { getMultisigAccountId } from "@polkadot-api/substrate-bindings";
import { state } from "@react-rxjs/core";
import { CompatibilityLevel } from "polkadot-api";
import {
  combineLatest,
  filter,
  map,
  merge,
  switchMap,
  withLatestFrom,
} from "rxjs";
import { FormSchema } from "../../RfpForm/formSchema";
import { selectedAccount$ } from "../../SelectAccount";
import { dismissable, submittedFormData$ } from "../modalActions";
import { getCreationMultisigCallMetadata, rfpBounty$ } from "./bountyCreation";
import { createTxProcess } from "./txProcess";
import { TxWithExplanation } from "./types";

export const getMultisigAddress = (formData: FormSchema) =>
  accId.dec(
    getMultisigAccountId({
      threshold: Math.min(
        formData.signatoriesThreshold,
        formData.supervisors.length,
      ),
      signatories: formData.supervisors.map(accId.enc),
    }),
  );

export const referendumCreationTx$ = state(
  rfpBounty$.pipe(
    withLatestFrom(
      submittedFormData$.pipe(filter((v) => !!v)),
      referendumExecutionBlocks$.pipe(filter((v) => !!v)),
    ),
    switchMap(
      ([{ bounty, multisigTimepoint }, formData, { bountyFunding }]) => {
        const curatorAddr =
          formData.supervisors.length === 1
            ? formData.supervisors[0]
            : getMultisigAddress(formData);

        const amount$ = combineLatest([
          curatorDeposit$,
          typedApi.query.System.Account.getValue(curatorAddr),
        ]).pipe(map(([deposit, account]) => deposit - account.data.free));

        const getReferendumProposal = async (): Promise<TxWithExplanation> => {
          if (
            await typedApi.tx.Bounties.approve_bounty_with_curator.isCompatible(
              CompatibilityLevel.Partial,
            )
          ) {
            return {
              tx: typedApi.tx.Bounties.approve_bounty_with_curator({
                bounty_id: bounty.id,
                curator: MultiAddress.Id(curatorAddr),
                fee: 0n,
              }),
              explanation: {
                text: "Approve with curator",
                params: {
                  curator: curatorAddr,
                },
              },
            };
          }

          const tx = typedApi.tx.Utility.batch({
            calls: [
              typedApi.tx.Bounties.approve_bounty({ bounty_id: bounty.id })
                .decodedCall,
              typedApi.tx.Scheduler.schedule({
                when: bountyFunding,
                priority: 255,
                call: typedApi.tx.Bounties.propose_curator({
                  bounty_id: bounty.id,
                  curator: MultiAddress.Id(curatorAddr),
                  fee: 0n,
                }).decodedCall,
                maybe_periodic: undefined,
              }).decodedCall,
            ],
          });
          return {
            tx,
            explanation: {
              text: "batch",
              params: {
                0: {
                  text: "Approve bounty",
                },
                1: {
                  text: "Schedule",
                  params: {
                    when: "After bounty funding",
                    call: {
                      text: "Propose curator",
                      params: {
                        curator: curatorAddr,
                      },
                    },
                  },
                },
              },
            },
          };
        };

        const proposal = getReferendumProposal();
        const proposalCallData = proposal.then((r) => r.tx.getEncodedData());
        const proposalTxExplanation = proposal.then((r) => r.explanation);

        return combineLatest([
          proposalCallData,
          proposalTxExplanation,
          amount$,
          selectedAccount$.pipe(filter((v) => !!v)),
          getTrack(bounty.value),
        ]).pipe(
          map(
            ([
              proposal,
              proposalExplanation,
              amount,
              selectedAccount,
              track,
            ]) => {
              const calls: TxWithExplanation[] = [];

              if (multisigTimepoint) {
                // First unlock the deposit, as it could prevent having enough funds for the following transactions.
                const metadata = getCreationMultisigCallMetadata(
                  formData,
                  selectedAccount.address,
                );
                if (metadata) {
                  calls.push({
                    tx: typedApi.tx.Multisig.cancel_as_multi({
                      ...metadata,
                      timepoint: multisigTimepoint,
                    }),
                    explanation: {
                      text: "Unlock deposit from indexing curator multisig",
                    },
                  });
                }
              }

              if (amount > 0) {
                calls.push({
                  tx: typedApi.tx.Balances.transfer_keep_alive({
                    dest: MultiAddress.Id(curatorAddr),
                    value: amount,
                  }),
                  explanation: {
                    text: "Transfer balance to curator",
                    params: {
                      destination: curatorAddr,
                      value: formatToken(amount),
                    },
                  },
                });
              }

              calls.push({
                tx: referendaSdk.createReferenda(track.origin, proposal),
                explanation: {
                  text: "Create referendum",
                  params: {
                    track: formatTrackName(track.track.name),
                    call: proposalExplanation,
                  },
                },
              });

              if (calls.length > 1) {
                return {
                  tx: typedApi.tx.Utility.batch_all({
                    calls: calls.map((c) => c.tx.decodedCall),
                  }),
                  explanation: {
                    text: "batch",
                    params: Object.fromEntries(
                      calls.map((v, i) => [i, v.explanation]),
                    ),
                  },
                };
              }
              return calls[0];
            },
          ),
          dismissable(),
        );
      },
    ),
  ),
  null,
);

export const [referendumCreationProcess$, submitReferendumCreation] =
  createTxProcess(referendumCreationTx$.pipe(map((v) => v?.tx ?? null)));

export const rfpReferendum$ = state(
  merge(
    referendumCreationProcess$.pipe(
      filter((v) => v?.type === "finalized" && v.ok),
      switchMap(async (v) => {
        const referendum = referendaSdk.getSubmittedReferendum(v);
        if (!referendum) {
          throw new Error("Submitted referendum could not be found");
        }
        return referendum;
      }),
    ),
    // try and load existing one if it's there
    rfpBounty$.pipe(
      switchMap(({ bounty }) => {
        if (bounty.type !== "Proposed") return [];

        return referendaSdk
          .getReferenda()
          .then((referenda) =>
            bounty.filterApprovingReferenda(
              referenda.filter((ref) => ref.type === "Ongoing"),
            ),
          );
      }),
      map((v) => v[0]?.referendum),
      filter((v) => !!v),
      map((v) => ({
        index: v.id,
        track: v.track,
        proposal: v.proposal.rawValue,
      })),
    ),
  ),
);
