import { ksm, polkadot_people } from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { startFromWorker } from "polkadot-api/smoldot/from-worker";
import SmWorker from "polkadot-api/smoldot/worker?worker";
import { withLogsRecorder } from "polkadot-api/logs-provider";
import { createChopsticksProvider } from "./lib/chopsticks-provider";
import { getSmProvider } from "polkadot-api/sm-provider";

export const smoldot = startFromWorker(new SmWorker(), {
  logCallback: (level, target, message) => {
    console.debug("smoldot[%s(%s)] %s", target, level, message);
  },
  forbidWs: true,
});

const kusamaChainSpec = import("polkadot-api/chains/ksmcc3");
const polkadotChainSpec = import("polkadot-api/chains/polkadot");
const peopleChainSpec = import("polkadot-api/chains/polkadot_people");

const kusamaChain = kusamaChainSpec.then(({ chainSpec }) =>
  smoldot.addChain({ chainSpec })
);
const polkadotChain = polkadotChainSpec.then(({ chainSpec }) =>
  smoldot.addChain({ chainSpec })
);
const peopleChain = Promise.all([polkadotChain, peopleChainSpec]).then(
  ([relayChain, { chainSpec }]) =>
    smoldot.addChain({ chainSpec, potentialRelayChains: [relayChain] })
);

export const peopleClient = createClient(getSmProvider(peopleChain));
export const peopleApi = peopleClient.getTypedApi(polkadot_people);

export const client = createClient(
  withLogsRecorder(
    console.log,
    createChopsticksProvider("wss://rpc.ibp.network/kusama")
    // getSmProvider(kusamaChain)
  )
);
export const typedApi = client.getTypedApi(ksm);
