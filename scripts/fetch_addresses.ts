import { createPublicClient, http } from "viem";
import { flareCoston2 } from "viem/chains";

const publicClient = createPublicClient({
  chain: flareCoston2,
  transport: http("https://coston2-api.flare.network/ext/C/rpc"),
});

const registryAddress = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
const registryAbi = [
  {
    type: "function",
    name: "getContractAddressByName",
    inputs: [{ type: "string", name: "name" }],
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAllContracts",
    inputs: [],
    outputs: [{ type: "string[]", name: "" }, { type: "address[]", name: "" }],
    stateMutability: "view",
  }
];

async function main() {
  try {
    const contracts = await publicClient.readContract({
      address: registryAddress,
      abi: registryAbi,
      functionName: "getAllContracts",
    });
    console.log("All contracts:");
    for(let i = 0; i < contracts[0].length; i++) {
        if (contracts[0][i].toLowerCase().includes("usdt") || 
            contracts[0][i].toLowerCase().includes("usdc") || 
            contracts[0][i].toLowerCase().includes("weth") || 
            contracts[0][i].toLowerCase().includes("fxrp") ||
            contracts[0][i].toLowerCase().includes("fasset")) {
            console.log(contracts[0][i], contracts[1][i]);
        }
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
