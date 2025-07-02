import { dot, ksm, polkadot_people } from "@polkadot-api/descriptors";
import {
  createReferendaSdk,
  kusamaSpenderOrigin,
} from "@polkadot-api/sdk-governance";
import { createClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getSmProvider } from "polkadot-api/sm-provider";
import { startFromWorker } from "polkadot-api/smoldot/from-worker";
import SmWorker from "polkadot-api/smoldot/worker?worker";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { matchedChain } from "./chainRoute";
import { FEATURE_LIGHT_CLIENT } from "./constants";
import { withChopsticksEnhancer } from "./lib/chopsticksEnhancer";

export const USE_CHOPSTICKS = import.meta.env.VITE_WITH_CHOPSTICKS;

export const smoldot = startFromWorker(new SmWorker(), {
  logCallback: (level, target, message) => {
    console.debug("smoldot[%s(%s)] %s", target, level, message);
  },
  forbidWs: true,
});

const kusamaChainSpec = import("polkadot-api/chains/ksmcc3");
const polkadotChainSpec = import("polkadot-api/chains/polkadot");
const peopleChainSpec = import("polkadot-api/chains/polkadot_people");

const getMainChainProvider = () => {
  if (matchedChain === "polkadot") {
    return getSmProvider(polkadotChain);
  }

  if (!FEATURE_LIGHT_CLIENT) {
    return withPolkadotSdkCompat(
      getWsProvider([
        "wss://kusama-rpc.publicnode.com",
        "wss://kusama-rpc.dwellir.com",
        "wss://rpc.ibp.network/kusama",
        "wss://kusama-rpc-tn.dwellir.com",
        "wss://rpc-kusama.luckyfriday.io",
      ]),
    );
  }

  const kusamaChain = kusamaChainSpec.then(({ chainSpec }) =>
    smoldot.addChain({ chainSpec }),
  );
  return getSmProvider(kusamaChain);
};
const polkadotChain = polkadotChainSpec.then(({ chainSpec }) =>
  smoldot.addChain({ chainSpec }),
);
const peopleChain = Promise.all([polkadotChain, peopleChainSpec]).then(
  ([relayChain, { chainSpec }]) =>
    smoldot.addChain({ chainSpec, potentialRelayChains: [relayChain] }),
);

export const peopleClient = createClient(getSmProvider(peopleChain));
export const peopleApi = peopleClient.getTypedApi(polkadot_people);

export const client = createClient(
  USE_CHOPSTICKS
    ? withChopsticksEnhancer(getWsProvider("ws://localhost:8132"))
    : getMainChainProvider(),
);

export const typedApi =
  matchedChain === "kusama" ? client.getTypedApi(ksm) : client.getTypedApi(dot);

export const referendaSdk =
  matchedChain === "kusama"
    ? createReferendaSdk(client.getTypedApi(ksm), {
        spenderOrigin: kusamaSpenderOrigin,
      })
    : createReferendaSdk(client.getTypedApi(dot));
