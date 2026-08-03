import { createPublicClient, http } from "viem";

const flareCoston2 = {
  id: 114,
  name: "Flare Coston2",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: { default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] } },
};

const publicClient = createPublicClient({ chain: flareCoston2, transport: http() });

const assets = [
  { symbol: "USDC", address: "0x8c0803566113B246abe776a31C5EE2Ce61D1F222" },
  { symbol: "USDT", address: "0xDF64D7BfeDf0100177d9276f83cF279093077b29" },
  { symbol: "WETH", address: "0x742E38637aD924117e39D6354C1ec81CED5872a6" },
  { symbol: "FASSET", address: "0x334460A7D40176Dff303E4dfC74B7bbF11C8c1b6" },
  { symbol: "FXRP", address: "0x0B847167664c3917f44738734262b8813C9a3dC7" }
];

async function main() {
  for (const a of assets) {
    const code = await publicClient.getBytecode({ address: a.address });
    console.log(`${a.symbol}: ${code ? "HAS CODE" : "NO CODE"}`);
  }
}
main();
