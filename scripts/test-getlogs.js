const { createPublicClient, http } = require("viem");
const { flareCoston2 } = require("viem/chains");

const indexerClient = createPublicClient({ chain: flareCoston2, transport: http("https://coston2-explorer.flare.network/api/eth-rpc") });

async function run() {
  try {
    const logs = await indexerClient.getLogs({
      address: "0x179BF34155cD129FeB3b2440f50418C4836e65D6",
      event: {
        type: "event",
        name: "MerchantRegistered",
        inputs: [
          { name: "merchantId", type: "bytes32", indexed: true },
          { name: "owner", type: "address", indexed: true },
          { name: "settlementAddress", type: "address", indexed: true }
        ]
      },
      args: { owner: "0x323d8ee95b5e81bf21d05237ac1501c41328ba50" },
      fromBlock: 33360332n
    });
    console.log("Found logs:", logs.length);
    console.log(logs[0]);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
