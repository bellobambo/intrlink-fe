import { createPublicClient, http } from "viem";

const flareCoston2 = {
  id: 114,
  name: "Flare Coston2",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: { default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] } },
};
const publicClient = createPublicClient({ chain: flareCoston2, transport: http() });

async function main() {
  const decimals = await publicClient.readContract({
    address: "0x0b6A3645c240605887a5532109323A3E12273dc7", // Actual FXRP
    abi: [{ type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8", name: "" }], stateMutability: "view" }],
    functionName: "decimals",
  });
  console.log("Actual FXRP decimals:", decimals);
}
main();
