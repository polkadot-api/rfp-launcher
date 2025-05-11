import { getSyncProvider } from "@polkadot-api/json-rpc-provider-proxy";

export const createChopsticksProvider = (endpoint: string) =>
  getSyncProvider(async () => {
    const { ChopsticksProvider, setStorage, setup } = await import(
      "@acala-network/chopsticks-core"
    );

    const chain = await setup({
      endpoint,
      mockSignatureHost: true,
    });

    await setStorage(chain, {
      System: {
        Account: [
          [
            ["5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"],
            {
              providers: 1,
              data: {
                free: "1000000000000000000",
              },
            },
          ],
        ],
      },
    });

    const innerProvider = new ChopsticksProvider(chain);
    return (onMessage) => {
      return {
        send: async (message: string) => {
          const parsed = JSON.parse(message);

          if (parsed.method === "chainHead_v1_follow") {
            const subscription = await innerProvider.subscribe(
              "chainHead_v1_followEvent",
              parsed.method,
              parsed.params,
              (err, result) => {
                if (err) {
                  console.error(err);
                  return;
                }
                onMessage(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    method: "chainHead_v1_followEvent",
                    params: {
                      subscription,
                      result,
                    },
                  })
                );
              }
            );
            onMessage(
              JSON.stringify({
                jsonrpc: "2.0",
                id: parsed.id,
                result: subscription,
              })
            );
            return;
          }

          const response = await innerProvider.send(
            parsed.method,
            parsed.params
          );
          onMessage(
            JSON.stringify({
              jsonrpc: "2.0",
              id: parsed.id,
              result: response,
            })
          );
        },
        disconnect: () => {},
      };
    };
  });
