import { polkadot_people } from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { startFromWorker } from "polkadot-api/smoldot/from-worker";
import SmWorker from "polkadot-api/smoldot/worker?worker";

export const smoldot = startFromWorker(new SmWorker(), {
  logCallback: (level, target, message) => {
    console.debug("smoldot[%s(%s)] %s", target, level, message);
  },
  forbidWs: true,
});

const polkadotChainSpec = import("polkadot-api/chains/polkadot");
const peopleChainSpec = import("polkadot-api/chains/polkadot_people");

const polkadotChain = polkadotChainSpec.then(({ chainSpec }) =>
  smoldot.addChain({ chainSpec })
);
const peopleChain = Promise.all([polkadotChain, peopleChainSpec]).then(
  ([relayChain, { chainSpec }]) =>
    smoldot.addChain({ chainSpec, potentialRelayChains: [relayChain] })
);

export const peopleClient = createClient(getSmProvider(peopleChain));
export const peopleApi = peopleClient.getTypedApi(polkadot_people);
