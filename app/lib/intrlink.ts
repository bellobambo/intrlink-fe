import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hex,
} from "viem";
import type { Chain } from "viem/chains";

export const intrlinkAddress = "0x2b7f7552E3B5902c2d1dAE65664ABE93F9d45795" as const;
export const intrlinkDeploymentBlock = BigInt(33539845);

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
  { type: "error", name: "Unauthorized", inputs: [{ name: "expected", type: "bytes32" }, { name: "actual", type: "address" }] },
  { type: "error", name: "ZeroAddress", inputs: [] },
  { type: "error", name: "InvalidMerchant", inputs: [] },
  { type: "error", name: "InvalidMerchantProfile", inputs: [] },
  { type: "error", name: "MerchantAlreadyExists", inputs: [{ name: "merchantId", type: "bytes32" }] },
  { type: "error", name: "InvalidSettlementAddress", inputs: [] },
  { type: "error", name: "InvalidIntent", inputs: [] },
  { type: "error", name: "IntentAlreadyExists", inputs: [{ name: "intentId", type: "bytes32" }] },
  { type: "error", name: "InvalidFiatAmount", inputs: [] },
  { type: "error", name: "InvalidItem", inputs: [{ name: "itemId", type: "bytes32" }] },
  { type: "error", name: "InvalidItemDetails", inputs: [] },
  { type: "error", name: "InvalidQuantity", inputs: [] },
  { type: "error", name: "EmptyCart", inputs: [] },
  { type: "error", name: "DuplicateCartItem", inputs: [{ name: "itemId", type: "bytes32" }] },
  { type: "error", name: "ItemAlreadyExists", inputs: [{ name: "itemId", type: "bytes32" }] },
  { type: "error", name: "AssetAlreadyExists", inputs: [{ name: "asset", type: "address" }] },
  { type: "error", name: "EmptyAssetBatch", inputs: [] },
  { type: "error", name: "UnsupportedAsset", inputs: [{ name: "asset", type: "address" }] },
  { type: "error", name: "InvalidDecimals", inputs: [] },
  { type: "error", name: "InvalidQuoteExpiry", inputs: [] },
  { type: "error", name: "InvalidOraclePrice", inputs: [] },
  { type: "error", name: "OracleDecimalsMismatch", inputs: [{ name: "expected", type: "uint8" }, { name: "actual", type: "int8" }] },
  { type: "error", name: "StaleOraclePrice", inputs: [{ name: "timestamp", type: "uint64" }, { name: "current", type: "uint64" }] },
  { type: "error", name: "IntentNotPayable", inputs: [{ name: "intentId", type: "bytes32" }, { name: "status", type: "uint8" }] },
  { type: "error", name: "IntentExpired", inputs: [{ name: "intentId", type: "bytes32" }] },
  { type: "error", name: "IncorrectNativeAmount", inputs: [{ name: "expected", type: "uint256" }, { name: "actual", type: "uint256" }] },
  { type: "error", name: "NativeTransferFailed", inputs: [] },
  { type: "error", name: "TokenTransferFailed", inputs: [] },
  { type: "error", name: "ContractPaused", inputs: [] },
  { type: "error", name: "ReentrantCall", inputs: [] },
  { type: "function", name: "getMerchant", stateMutability: "view", inputs: [{ name: "merchantId", type: "bytes32" }], outputs: [{ type: "tuple", components: [{ name: "owner", type: "address" }, { name: "settlementAddress", type: "address" }, { name: "companyName", type: "string" }, { name: "ownerName", type: "string" }, { name: "location", type: "string" }, { name: "exists", type: "bool" }] }] },
  { type: "function", name: "getMerchantIdByOwner", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "getMerchantByOwner", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "tuple", components: [{ name: "owner", type: "address" }, { name: "settlementAddress", type: "address" }, { name: "companyName", type: "string" }, { name: "ownerName", type: "string" }, { name: "location", type: "string" }, { name: "exists", type: "bool" }] }] },
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
  { type: "function", name: "disableAsset", stateMutability: "nonpayable", inputs: [{ name: "merchantId", type: "bytes32" }, { name: "asset", type: "address" }], outputs: [] },
  { type: "function", name: "enableAsset", stateMutability: "nonpayable", inputs: [{ name: "merchantId", type: "bytes32" }, { name: "asset", type: "address" }], outputs: [] },
  { type: "function", name: "addItems", stateMutability: "nonpayable", inputs: [{ name: "merchantId", type: "bytes32" }, { name: "items", type: "tuple[]", components: [{ name: "itemId", type: "bytes32" }, { name: "name", type: "string" }, { name: "priceMinor", type: "uint128" }, { name: "category", type: "string" }] }], outputs: [] },
  { type: "function", name: "updateItem", stateMutability: "nonpayable", inputs: [{ name: "merchantId", type: "bytes32" }, { name: "itemId", type: "bytes32" }, { name: "name", type: "string" }, { name: "priceMinor", type: "uint128" }, { name: "category", type: "string" }], outputs: [] },
  { type: "function", name: "setItemAvailability", stateMutability: "nonpayable", inputs: [{ name: "merchantId", type: "bytes32" }, { name: "itemId", type: "bytes32" }, { name: "available", type: "bool" }], outputs: [] },
  { type: "function", name: "createCartPaymentIntent", stateMutability: "nonpayable", inputs: [{ name: "intentId", type: "bytes32" }, { name: "merchantId", type: "bytes32" }, { name: "cart", type: "tuple[]", components: [{ name: "itemId", type: "bytes32" }, { name: "quantity", type: "uint128" }] }, { name: "asset", type: "address" }, { name: "expiresAt", type: "uint64" }, { name: "metadataHash", type: "bytes32" }], outputs: [{ name: "requiredAssetAmount", type: "uint256" }] },
  { type: "function", name: "cancelIntent", stateMutability: "nonpayable", inputs: [{ name: "intentId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "expireIntent", stateMutability: "nonpayable", inputs: [{ name: "intentId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "getMerchantAsset", stateMutability: "view", inputs: [{ name: "merchantId", type: "bytes32" }, { name: "asset", type: "address" }], outputs: [{ type: "tuple", components: [{ name: "feedId", type: "bytes21" }, { name: "tokenDecimals", type: "uint8" }, { name: "feedDecimals", type: "uint8" }, { name: "enabled", type: "bool" }, { name: "exists", type: "bool" }] }] },
  { type: "function", name: "getMerchantItem", stateMutability: "view", inputs: [{ name: "merchantId", type: "bytes32" }, { name: "itemId", type: "bytes32" }], outputs: [{ type: "tuple", components: [{ name: "name", type: "string" }, { name: "priceMinor", type: "uint128" }, { name: "category", type: "string" }, { name: "available", type: "bool" }, { name: "exists", type: "bool" }] }] },
  { type: "function", name: "getPaymentIntentCart", stateMutability: "view", inputs: [{ name: "intentId", type: "bytes32" }], outputs: [{ type: "tuple[]", components: [{ name: "itemId", type: "bytes32" }, { name: "quantity", type: "uint128" }, { name: "unitPriceMinor", type: "uint128" }] }] },
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

export const assetEnabledEvent = {
  type: "event",
  name: "AssetEnabled",
  inputs: [
    { name: "merchantId", type: "bytes32", indexed: true },
    { name: "asset", type: "address", indexed: true },
    { name: "feedId", type: "bytes21", indexed: true },
    { name: "tokenDecimals", type: "uint8", indexed: false },
    { name: "feedDecimals", type: "uint8", indexed: false },
  ],
} as const;

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
} as const;

export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

export const publicClient = createPublicClient({ chain: flareCoston2, transport: http() });
export const indexerClient = createPublicClient({ chain: flareCoston2, transport: http("https://coston2-explorer.flare.network/api/eth-rpc") });

export type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

function hasProviderErrorCode(error: unknown, code: number): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export function getProvider() {
  return typeof window === "undefined" ? undefined : (window.ethereum as WalletProvider | undefined);
}

export async function connectCoston2(provider: WalletProvider) {
  const chainId = await provider.request({ method: "eth_chainId" }) as Hex;
  if (Number(chainId) !== flareCoston2.id) {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x72" }] });
    } catch (error: unknown) {
      if (!hasProviderErrorCode(error, 4902)) throw error;
      await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x72", chainName: flareCoston2.name, nativeCurrency: flareCoston2.nativeCurrency, rpcUrls: flareCoston2.rpcUrls.default.http, blockExplorerUrls: ["https://coston2.testnet.flarescan.com"] }] });
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x72" }] });
    }
  }

  const accounts = await provider.request({ method: "eth_requestAccounts" }) as Address[];
  if (!accounts[0]) throw new Error("No wallet account was returned.");
  return accounts[0];
}

export function walletClient(provider: WalletProvider, account: Address) {
  return createWalletClient({ account, chain: flareCoston2, transport: custom(provider) });
}
