import { createPublicClient, http } from "viem";

const publicClient = createPublicClient({ transport: http("https://baremetal.coston2.flare.network/ext/bc/C/rpc") });

async function main() {
  const latest = await publicClient.getBlockNumber();
  try {
    await publicClient.getLogs({
      address: "0x8990E4968C488F3eFfc1E46B2dD646B31633519E",
      fromBlock: latest - 10000n,
      toBlock: latest
    });
    console.log("BAREMETAL SUCCESS");
  } catch(e) {
    console.error("BAREMETAL ERROR:", e.message.substring(0, 200));
  }
}
main();
