import { createPublicClient, http, keccak256, stringToHex, pad } from "viem";

const indexerClient = createPublicClient({ transport: http("https://coston2-explorer.flare.network/api/eth-rpc") });

async function main() {
  try {
    const logs = await indexerClient.getLogs({
      address: "0x2b7f7552E3B5902c2d1dAE65664ABE93F9d45795",
      topics: [
        keccak256(stringToHex("AssetEnabled(bytes32,address,bytes21,uint8,uint8)")),
        pad("0x88a6f64c91873d9e405aede191f7deca9c284767a644db35770b7f6b222f486b")
      ],
      fromBlock: 33539845n
    });
    console.log("SUCCESS, logs length:", logs.length);
  } catch(e) {
    console.error("ERROR:", e);
  }
}
main();
