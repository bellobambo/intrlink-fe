import { keccak256, stringToHex } from "viem";
const topic0 = keccak256(stringToHex("PaymentIntentCreated(bytes32,bytes32,bytes32,address,uint256,uint256,uint64,bytes32)"));
const merchantId = "0x88a6f64c91873d9e405aede191f7deca9c284767a644db35770b7f6b222f486b";

async function main() {
  const url = `https://coston2-explorer.flare.network/api?module=logs&action=getLogs&address=0x2b7f7552E3B5902c2d1dAE65664ABE93F9d45795&fromBlock=33539845&toBlock=latest&topic0=${topic0}&topic0_2_opr=and&topic2=${merchantId}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log("REST SUCCESS:", data.status, data.message, data.result?.length || "no result");
}
main();
