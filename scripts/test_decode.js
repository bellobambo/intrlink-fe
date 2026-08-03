import { decodeEventLog, keccak256, stringToHex } from "viem";

export const paymentIntentCreatedEvent = {
  type: "event",
  name: "PaymentIntentCreated",
  inputs: [
    { name: "intentId", type: "bytes32", indexed: true },
    { name: "merchantId", type: "bytes32", indexed: true },
    { name: "itemId", type: "bytes32", indexed: true },
    { name: "asset", type: "address", indexed: false },
    { name: "fiatAmountMinor", type: "uint256", indexed: false },
    { name: "requiredAssetAmount", type: "uint256", indexed: false },
    { name: "expiresAt", type: "uint64", indexed: false },
    { name: "metadataHash", type: "bytes32", indexed: false },
  ],
};

const topic0 = keccak256(stringToHex("PaymentIntentCreated(bytes32,bytes32,bytes32,address,uint256,uint256,uint64,bytes32)"));

async function main() {
  const url = `https://coston2-explorer.flare.network/api?module=logs&action=getLogs&address=0x2b7f7552E3B5902c2d1dAE65664ABE93F9d45795&fromBlock=33539845&toBlock=latest&topic0=${topic0}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.result?.length > 0) {
    const rawLog = data.result[0];
    const decoded = decodeEventLog({
      abi: [paymentIntentCreatedEvent],
      data: rawLog.data,
      topics: rawLog.topics
    });
    console.log("DECODED:", decoded.args);
  }
}
main();
