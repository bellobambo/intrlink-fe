import { createPublicClient, http } from "viem";

const flareCoston2 = {
  id: 114,
  name: "Flare Coston2",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: { default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] } },
};
const publicClient = createPublicClient({ chain: flareCoston2, transport: http() });

const registryAddress = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
const registryAbi = [
  { type: "function", name: "getAllContracts", inputs: [], outputs: [{ type: "string[]", name: "" }, { type: "address[]", name: "" }], stateMutability: "view" },
];

async function main() {
  const [names, addresses] = await publicClient.readContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: "getAllContracts",
  });
  
  for (let i = 0; i < names.length; i++) {
    if (names[i].includes("XRP") || names[i].includes("USD") || names[i].includes("Test") || names[i].includes("Token")) {
      console.log(`${names[i]}: ${addresses[i]}`);
    }
  }
}
main();
