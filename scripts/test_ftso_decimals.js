import { createPublicClient, http } from "viem";

const flareCoston2 = {
  id: 114,
  name: "Flare Coston2",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: { default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] } },
};

const publicClient = createPublicClient({
  chain: flareCoston2,
  transport: http(),
});

const registryAddress = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
const registryAbi = [
  { type: "function", name: "getContractAddressByName", inputs: [{ type: "string", name: "name" }], outputs: [{ type: "address", name: "" }], stateMutability: "view" },
];

const ftsoAbi = [
  { type: "function", name: "getFeedById", inputs: [{ type: "bytes21", name: "feedId" }], outputs: [{ type: "uint256", name: "value" }, { type: "int8", name: "decimals" }, { type: "uint64", name: "timestamp" }], stateMutability: "view" },
];

async function main() {
  const ftsoV2Address = await publicClient.readContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: "getContractAddressByName",
    args: ["FtsoV2"], 
  });
  console.log("FtsoV2:", ftsoV2Address);
  
  const feeds = [
    { symbol: "C2FLR", id: "0x01464c522f55534400000000000000000000000000" },
    { symbol: "USDC", id: "0x01555344432f55534400000000000000000000000000".slice(0, 44) },
    { symbol: "USDT", id: "0x01555344542f55534400000000000000000000000000".slice(0, 44) },
    { symbol: "WETH", id: "0x014554482f55534400000000000000000000000000" },
    { symbol: "FASSET", id: "0x014641535345542f55534400000000000000000000".slice(0, 44) },
    { symbol: "FXRP", id: "0x015852502f55534400000000000000000000000000" },
    { symbol: "FBTC", id: "0x014254432f55534400000000000000000000000000" },
    { symbol: "FDOGE", id: "0x01444f47452f555344000000000000000000000000" }
  ];

  for (const feed of feeds) {
    try {
      const result = await publicClient.readContract({
        address: ftsoV2Address,
        abi: ftsoAbi,
        functionName: "getFeedById",
        args: [feed.id],
      });
      console.log(`${feed.symbol}: value=${result[0]}, decimals=${result[1]}, timestamp=${result[2]}`);
    } catch (e) {
      console.error(`Error for ${feed.symbol}:`, e.message.substring(0, 100));
    }
  }
}

main();
