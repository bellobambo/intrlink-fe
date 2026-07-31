import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hex,
} from "viem";
import type { Chain } from "viem/chains";

export const intrlinkAddress = "0x179BF34155cD129FeB3b2440f50418C4836e65D6" as const;

export const flareCoston2: Chain = {
  id: 114,
  name: "Flare Coston2",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Flare Explorer", url: "https://coston2.testnet.flarescan.com" },
  },
  testnet: true,
};

export const intrlinkAbi = [
  { type: "function", name: "getMerchant", stateMutability: "view", inputs: [{ name: "merchantId", type: "bytes32" }], outputs: [{ type: "tuple", components: [{ name: "owner", type: "address" }, { name: "settlementAddress", type: "address" }, { name: "companyName", type: "string" }, { name: "ownerName", type: "string" }, { name: "location", type: "string" }, { name: "exists", type: "bool" }] }] },
  { type: "function", name: "getPaymentIntent", stateMutability: "view", inputs: [{ name: "intentId", type: "bytes32" }], outputs: [{ type: "tuple", components: [{ name: "merchantId", type: "bytes32" }, { name: "itemId", type: "bytes32" }, { name: "merchantOwner", type: "address" }, { name: "settlementAddress", type: "address" }, { name: "asset", type: "address" }, { name: "fiatAmountMinor", type: "uint128" }, { name: "requiredAssetAmount", type: "uint128" }, { name: "quotedAt", type: "uint64" }, { name: "expiresAt", type: "uint64" }, { name: "metadataHash", type: "bytes32" }, { name: "status", type: "uint8" }] }] },
  { type: "function", name: "registerMerchant", stateMutability: "nonpayable", inputs: [{ name: "merchantId", type: "bytes32" }, { name: "settlementAddress", type: "address" }, { name: "companyName", type: "string" }, { name: "ownerName", type: "string" }, { name: "location", type: "string" }], outputs: [] },
  { type: "function", name: "addAsset", stateMutability: "nonpayable", inputs: [{ name: "merchantId", type: "bytes32" }, { name: "asset", type: "address" }, { name: "feedId", type: "bytes21" }, { name: "tokenDecimals", type: "uint8" }, { name: "feedDecimals", type: "uint8" }], outputs: [] },
  {
    type: "function",
    name: "addAssets",
    stateMutability: "nonpayable",
    inputs: [
      { name: "merchantId", type: "bytes32" },
      {
        name: "assets",
        type: "tuple[]",
        components: [
          { name: "asset", type: "address" },
          { name: "feedId", type: "bytes21" },
          { name: "tokenDecimals", type: "uint8" },
          { name: "feedDecimals", type: "uint8" },
        ],
      },
    ],
    outputs: [],
  },
  { type: "function", name: "addItem", stateMutability: "nonpayable", inputs: [{ name: "merchantId", type: "bytes32" }, { name: "itemId", type: "bytes32" }, { name: "name", type: "string" }, { name: "priceMinor", type: "uint128" }, { name: "category", type: "string" }], outputs: [] },
  { type: "function", name: "createPaymentIntent", stateMutability: "nonpayable", inputs: [{ name: "intentId", type: "bytes32" }, { name: "merchantId", type: "bytes32" }, { name: "asset", type: "address" }, { name: "fiatAmountMinor", type: "uint128" }, { name: "expiresAt", type: "uint64" }, { name: "metadataHash", type: "bytes32" }], outputs: [{ name: "requiredAssetAmount", type: "uint256" }] },
  { type: "function", name: "createItemPaymentIntent", stateMutability: "nonpayable", inputs: [{ name: "intentId", type: "bytes32" }, { name: "merchantId", type: "bytes32" }, { name: "itemId", type: "bytes32" }, { name: "asset", type: "address" }, { name: "expiresAt", type: "uint64" }, { name: "metadataHash", type: "bytes32" }], outputs: [{ name: "requiredAssetAmount", type: "uint256" }] },
  { type: "function", name: "payNative", stateMutability: "payable", inputs: [{ name: "intentId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "payToken", stateMutability: "nonpayable", inputs: [{ name: "intentId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "updateMerchantProfile", stateMutability: "nonpayable", inputs: [{ name: "merchantId", type: "bytes32" }, { name: "companyName", type: "string" }, { name: "ownerName", type: "string" }, { name: "location", type: "string" }], outputs: [] },
  { type: "function", name: "updateSettlementAddress", stateMutability: "nonpayable", inputs: [{ name: "merchantId", type: "bytes32" }, { name: "newSettlementAddress", type: "address" }], outputs: [] },
  {
    type: "event",
    name: "AssetEnabled",
    inputs: [
      { name: "merchantId", type: "bytes32", indexed: true },
      { name: "asset", type: "address", indexed: true },
      { name: "feedId", type: "bytes21", indexed: true },
      { name: "tokenDecimals", type: "uint8", indexed: false },
      { name: "feedDecimals", type: "uint8", indexed: false },
    ],
  },
] as const;

export const itemAddedEvent = {
  type: "event",
  name: "ItemAdded",
  inputs: [
    { name: "merchantId", type: "bytes32", indexed: true },
    { name: "itemId", type: "bytes32", indexed: true },
    { name: "name", type: "string", indexed: false },
    { name: "priceMinor", type: "uint256", indexed: false },
    { name: "category", type: "string", indexed: false },
  ],
} as const;

export const erc20Abi = [
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

export const publicClient = createPublicClient({ chain: flareCoston2, transport: http() });

export type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

export function getProvider() {
  return typeof window === "undefined" ? undefined : (window.ethereum as WalletProvider | undefined);
}

export async function connectCoston2(provider: WalletProvider) {
  const accounts = await provider.request({ method: "eth_requestAccounts" }) as Address[];
  const chainId = await provider.request({ method: "eth_chainId" }) as Hex;
  if (Number(chainId) !== flareCoston2.id) {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x72" }] });
    } catch (error: unknown) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== 4902) throw error;
      await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x72", chainName: flareCoston2.name, nativeCurrency: flareCoston2.nativeCurrency, rpcUrls: flareCoston2.rpcUrls.default.http, blockExplorerUrls: ["https://coston2.testnet.flarescan.com"] }] });
    }
  }
  if (!accounts[0]) throw new Error("No wallet account was returned.");
  return accounts[0];
}

export function walletClient(provider: WalletProvider, account: Address) {
  return createWalletClient({ account, chain: flareCoston2, transport: custom(provider) });
}
