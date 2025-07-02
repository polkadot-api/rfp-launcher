import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import {
  entropyToMiniSecret,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";
import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { createClient, getSs58AddressInfo } from "polkadot-api";
import { getPolkadotSigner } from "polkadot-api/signer";
import { getWsProvider } from "polkadot-api/ws-provider/web";

const alice_mnemonic =
  "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
const entropy = mnemonicToEntropy(alice_mnemonic);
const miniSecret = entropyToMiniSecret(entropy);
const derive = sr25519CreateDerive(miniSecret);
const alice = derive("//Alice");
const aliceSigner = getPolkadotSigner(alice.publicKey, "Sr25519", alice.sign);

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

const ENDPOINT = process.argv.includes("polkadot")
  ? "wss://rpc.ibp.network/polkadot"
  : "wss://rpc.ibp.network/kusama";
const LOCAL_RPC_PORT = 8132;
const CONTROLLER_PORT = LOCAL_RPC_PORT + 1;

const logStream = createWriteStream("./chopsticks.log");
const logStreamErr = createWriteStream("./chopsticks_err.log");
const chopsticksProcess = spawn("pnpm", [
  "chopsticks",
  `--endpoint=${ENDPOINT}`,
  `--port=${LOCAL_RPC_PORT}`,
]);
chopsticksProcess.stdout.pipe(logStream);
chopsticksProcess.stderr.pipe(logStreamErr);

console.log(
  "Connecting to chopsticks… It might take a few retries until the chain is up",
);
let client = createClient(getWsProvider(`ws://localhost:${LOCAL_RPC_PORT}`));
let api = client.getUnsafeApi();

try {
  await api.runtimeToken;
  console.log("Add funds to ALICE");

  const aliceInfo = getSs58AddressInfo(ALICE);
  if (!aliceInfo.isValid) throw new Error("Alice address not valid");

  const alice_balance = 10_000_000000000000n;
  await client._request("dev_setStorage", [
    {
      system: {
        account: [
          [[ALICE], { providers: 1, data: { free: alice_balance.toString() } }],
        ],
      },
    },
  ]);
} catch (ex) {
  console.error(ex);
  chopsticksProcess.kill();
  client.destroy();
  process.exit(1);
}

const jumpBlocks = async (height: number, count?: number) => {
  await client._request("dev_newBlock", [
    {
      count,
      unsafeBlockHeight: height,
    },
  ]);

  // Because the height jump, we have to restart the client
  // otherwise the block height will be wrong on new tx
  console.log("Restarting client");
  client.destroy();
  client = createClient(getWsProvider(`ws://localhost:${LOCAL_RPC_PORT}`));
  api = client.getUnsafeApi();
  await api.runtimeToken;
};

const approveReferendum = async (id: number, firstCall = true) => {
  console.log(`Loading referendum ${id} status`);
  const referendumInfo =
    await api.query.Referenda.ReferendumInfoFor.getValue(id);
  if (!referendumInfo) {
    throw new Error("Referendum not found");
  }
  if (referendumInfo?.type !== "Ongoing") {
    if (firstCall) {
      throw new Error("Referendum already ended");
    }
    console.log("Referendum ended");
    return;
  }

  if (!referendumInfo.value.decision_deposit) {
    console.log("Placing decision deposit");
    await api.tx.Referenda.place_decision_deposit({
      index: id,
    }).signAndSubmit(aliceSigner);
    return approveReferendum(id, false);
  }
  if (!referendumInfo.value.deciding) {
    console.log("Jump to start deciding phase");
    await jumpBlocks(referendumInfo.value.alarm![0]);
    return approveReferendum(id, false);
  }
  if (
    !referendumInfo.value.tally.support ||
    referendumInfo.value.tally.nays >= referendumInfo.value.tally.ayes
  ) {
    console.log("Voting aye");
    await api.tx.ConvictionVoting.vote({
      poll_index: id,
      vote: {
        type: "Standard",
        value: {
          vote: 0b1000_0000,
          balance: 5_000_000000000000n,
        },
      },
    }).signAndSubmit(aliceSigner);
    return approveReferendum(id, false);
  }
  if (!referendumInfo.value.deciding.confirming) {
    console.log("Jump to confirm phase");
    await jumpBlocks(referendumInfo.value.alarm![0]);
    return approveReferendum(id, false);
  }

  console.log("Jump to end confirm phase");
  await jumpBlocks(referendumInfo.value.alarm![0]);

  const currentFinalized = await client.getFinalizedBlock();
  const period = (await api.constants.Referenda.Tracks()).find(
    ([id]) => id === referendumInfo.value.track,
  )![1].min_enactment_period;
  console.log("Wait one block");
  await client._request("dev_newBlock", []);

  console.log("Jump to enactment", currentFinalized.number + period);
  await jumpBlocks(currentFinalized.number + period);

  console.log("unlock funds");
  const result = await api.tx.Utility.batch_all({
    calls: [
      api.tx.ConvictionVoting.remove_vote({
        index: id,
        class: referendumInfo.value.track,
      }).decodedCall,
      api.tx.ConvictionVoting.unlock({
        class: referendumInfo.value.track,
        target: {
          type: "Id",
          value: ALICE,
        },
      }).decodedCall,
      api.tx.Referenda.refund_decision_deposit({
        index: id,
      }).decodedCall,
    ],
  }).signAndSubmit(aliceSigner);

  if (result.ok) {
    console.log("Success");
  } else {
    console.log("Couldn't unlock, probably something went wrong");
  }
};

const test_balance = 100_000000000000n;
const CORS_HEADERS = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  },
};

console.log("Producing initial block");
await client._request("dev_newBlock", []);

console.log("Controller listeneing on port " + CONTROLLER_PORT);
Bun.serve({
  port: CONTROLLER_PORT,
  idleTimeout: 60,
  routes: {
    "/treasury_spend": async () => {
      console.log("Jumping to next spend period");

      try {
        const currentFinalized = await client.getFinalizedBlock();
        const period = await api.constants.Treasury.SpendPeriod();
        const nextSpendPeriod =
          (Math.floor(currentFinalized.number / period) + 1) * period;

        await jumpBlocks(nextSpendPeriod, 2);
      } catch (ex) {
        console.error(ex);
        return Response.error();
      }

      return Response.json({}, CORS_HEADERS);
    },
    "/approve_referendum/:id": async (req) => {
      try {
        await approveReferendum(Number(req.params.id));
      } catch (ex) {
        console.error(ex);
        return Response.error();
      }

      return Response.json({}, CORS_HEADERS);
    },
    "/reset_balance/:id": async (req) => {
      await client._request("dev_setStorage", [
        {
          system: {
            account: [
              [
                [req.params.id],
                { providers: 1, data: { free: test_balance.toString() } },
              ],
            ],
          },
        },
      ]);
      await client._request("dev_newBlock", []);

      return Response.json({}, CORS_HEADERS);
    },
  },
});
