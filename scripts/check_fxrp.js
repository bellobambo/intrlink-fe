import { createPublicClient, http } from "viem";

const flareCoston2 = {
  id: 114,
  name: "Flare Coston2",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: { default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] } },
};
const publicClient = createPublicClient({ chain: flareCoston2, transport: http() });

async function main() {
  const fAsset = await publicClient.readContract({
    address: "0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA", // AssetManagerFXRP
    abi: [{ type: "function", name: "fAsset", inputs: [], outputs: [{ type: "address", name: "" }], stateMutability: "view" }],
    functionName: "fAsset",
  });
  console.log("Actual FXRP Address:", fAsset);
}
main();
