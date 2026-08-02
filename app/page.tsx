"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { isAddress, keccak256, stringToHex, zeroAddress, type Address, type Hex } from "viem";
import { connectCoston2, erc20Abi, getProvider, intrlinkAbi, intrlinkAddress, intrlinkDeploymentBlock, itemAddedEvent, assetEnabledEvent, publicClient, indexerClient, walletClient } from "./lib/intrlink";
import { Drawer, QRCode } from "antd";
import { ShopOutlined, WalletOutlined, AppstoreOutlined, ShoppingCartOutlined, CreditCardOutlined, DeleteOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";


const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  "0xf7640c4b": "This merchant is already registered. Continuing with the existing merchant profile.",
  "0x6c49afa1": "This checkout has expired. Ask the merchant to create a new payment link.",
  "0xe7ecdcfd": "This checkout is no longer payable. It may already be paid, cancelled, or expired.",
  "0x5693fffb": "The wallet did not send the exact amount required for this checkout.",
  "0xee84f40b": "The payment asset is not available for this checkout.",
};

function getErrMsg(err: unknown, fallback: string) {
  const errorText = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  for (const [selector, message] of Object.entries(CONTRACT_ERROR_MESSAGES)) {
    if (errorText.includes(selector)) return message;
  }
  if (errorText.includes("merchantalreadyexists")) {
    return "This merchant is already registered. Continuing with the existing merchant profile.";
  }
  if (err instanceof Error) {
    if ('shortMessage' in err && typeof (err as any).shortMessage === 'string') return (err as any).shortMessage;
    const msg = err.message.split('\n')[0];
    return msg.length > 100 ? msg.substring(0, 100) + '...' : msg;
  }
  return fallback;
}

// ─── Flare-verified asset registry ────────────────────────────────────────────
// FTSOv2 feed IDs are 21-byte identifiers: 0x + category byte + hex(feedName) padded to 42 hex chars
// Source: https://dev.flare.network/ftso/feeds
const SUPPORTED_ASSETS = [
  {
    symbol: "C2FLR",
    name: "Native Coston2 Flare",
    address: zeroAddress as Address,           // Native token uses zero address per Intrlink spec
    feedId: "0x01464c522f55534400000000000000000000000000" as Hex, // FLR/USD
    tokenDecimals: 18,
    feedDecimals: 8,
    description: "Native gas token of Coston2 testnet",
  },
  /*
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x8c0803566113B246abe776a31C5EE2Ce61D1F222" as Address, // Coston2 Test USDC
    feedId: "0x01555344432f55534400000000000000000000000000".slice(0, 44) as Hex, // USDC/USD — padded to bytes21
    tokenDecimals: 6,
    feedDecimals: 8,
    description: "USD-pegged stablecoin",
  },
  */
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0xDF64D7BfeDf0100177d9276f83cF279093077b29" as Address, // Coston2 Test USDT (USDT0)
    feedId: "0x01555344542f55534400000000000000000000000000".slice(0, 44) as Hex, // USDT/USD
    tokenDecimals: 6,
    feedDecimals: 8,
    description: "Tether USD stablecoin",
  },
  /*
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0x742E38637aD924117e39D6354C1ec81CED5872a6" as Address, // Coston2 Mock WETH
    feedId: "0x014554482f55534400000000000000000000000000" as Hex, // ETH/USD
    tokenDecimals: 18,
    feedDecimals: 8,
    description: "Ethereum on Flare",
  },
  {
    symbol: "FASSET",
    name: "Flare Asset",
    address: "0x334460A7D40176Dff303E4dfC74B7bbF11C8c1b6" as Address, // Generic FAsset mock
    feedId: "0x014641535345542f55534400000000000000000000".slice(0, 44) as Hex, // FASSET/USD
    tokenDecimals: 18,
    feedDecimals: 8,
    description: "Trustless bridged asset",
  },
  */
  {
    symbol: "FXRP",
    name: "XRP Token",
    address: "0x0B847167664c3917f44738734262b8813C9a3dC7" as Address, // Coston2 FTestXRP
    feedId: "0x015852502f55534400000000000000000000000000" as Hex, // XRP/USD
    tokenDecimals: 6,
    feedDecimals: 8,
    description: "XRP bridged to Flare",
  },
  /*
  {
    symbol: "FBTC",
    name: "Bitcoin (FAsset)",
    address: "0x1111111111111111111111111111111111111111" as Address, // Placeholder Address
    feedId: "0x014254432f55534400000000000000000000000000" as Hex, // BTC/USD
    tokenDecimals: 8,
    feedDecimals: 8,
    description: "Bitcoin bridged to Flare",
  },
  {
    symbol: "FDOGE",
    name: "Dogecoin (FAsset)",
    address: "0x2222222222222222222222222222222222222222" as Address, // Placeholder Address
    feedId: "0x01444f47452f555344000000000000000000000000" as Hex, // DOGE/USD
    tokenDecimals: 8,
    feedDecimals: 8,
    description: "Dogecoin bridged to Flare",
  },
  */
] as const;

type SupportedAsset = typeof SUPPORTED_ASSETS[number];

type View = "merchant" | "asset" | "checkout" | "pay" | "payments";
type CatalogueItem = { id: Hex; name: string; priceMinor: bigint; category: string };
type PaymentDetails = { merchantId: Hex; asset: Address; fiatAmountMinor: bigint; requiredAssetAmount: bigint; expiresAt: bigint; status: number };
type PaymentLine = { id: Hex; name: string; quantity: bigint; unitPriceMinor: bigint };
type PaymentHistoryEntry = PaymentDetails & { id: Hex; createdAt: bigint };

const LOG_BLOCK_RANGE = BigInt(30);
const PAYMENT_INTENT_CREATED_TOPIC = keccak256(stringToHex("PaymentIntentCreated(bytes32,bytes32,bytes32,address,uint256,uint256,uint64,bytes32)"));
const MERCHANT_PROFILE_CACHE_PREFIX = "intrlink:merchant-profile:";

type MerchantProfileCache = {
  merchantId: Hex;
  merchantName: string;
  ownerName: string;
  location: string;
  settlementAddress: Address;
  updatedAt: number;
};

function paymentStatus(status: number, expiresAt: bigint) {
  if (status === 1 && BigInt(Math.floor(Date.now() / 1000)) >= expiresAt) return "Expired";
  return (["Unknown", "Pending", "Paid", "Cancelled", "Expired"][status] ?? "Unknown");
}

async function findMerchantIdByOwner(owner: Address): Promise<Hex | undefined> {
  try {
    const merchantId = await publicClient.readContract({
      address: intrlinkAddress,
      abi: intrlinkAbi,
      functionName: "getMerchantIdByOwner",
      args: [owner],
    });
    if (merchantId && merchantId !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return merchantId;
    }
  } catch (error) {
    console.warn("Merchant lookup by connected wallet failed:", error);
  }
}

function hasPaymentIntentInUrl() {
  return typeof window !== "undefined" && Boolean(new URLSearchParams(window.location.search).get("intentId"));
}

function merchantProfileCacheKey(account: Address) {
  return `${MERCHANT_PROFILE_CACHE_PREFIX}${account.toLowerCase()}`;
}

function readMerchantProfileCache(account: Address): MerchantProfileCache | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = window.localStorage.getItem(merchantProfileCacheKey(account));
    if (!cached) return null;
    return JSON.parse(cached) as MerchantProfileCache;
  } catch {
    return null;
  }
}

function writeMerchantProfileCache(account: Address, profile: MerchantProfileCache) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(merchantProfileCacheKey(account), JSON.stringify(profile));
  } catch {
    // Ignore cache write failures.
  }
}

function clearMerchantProfileCache(account: Address) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(merchantProfileCacheKey(account));
  } catch {
    // Ignore cache clear failures.
  }
}

function refreshAfterContractWrite() {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    window.location.reload();
  }, 450);
}

function Brand() {
  return <a className="brand" href="#top" aria-label="Intrlink home"><span className="brand-mark"><i/><i/><i/></span><span>intrlink</span></a>;
}

export default function Home() {
  const [account, setAccount] = useState<Address>();
  const [balance, setBalance] = useState<string | null>(null);
  const [view, setView] = useState<View>("merchant");
  const [busy, setBusy] = useState(false);
  const [isCheckingMerchant, setIsCheckingMerchant] = useState(false);
    const [merchantName, setMerchantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [location, setLocation] = useState("");
  const [merchantId, setMerchantId] = useState<Hex | "">("");
  const [asset, setAsset] = useState<string>("");
  const [expiryMinutes, setExpiryMinutes] = useState(4);
  const [assetPrices, setAssetPrices] = useState<Record<string, number>>({});
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [enablingProgress, setEnablingProgress] = useState<{ current: number; total: number } | null>(null);
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const [enabledAssetsList, setEnabledAssetsList] = useState<Address[]>([]);
  const assetDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(e.target as Node)) {
        setAssetDropdownOpen(false);
      }
    }
    if (assetDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [assetDropdownOpen]);
  const [batchItems, setBatchItems] = useState([{ name: "", price: "", category: "" }]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [cart, setCart] = useState<Record<Hex, number>>({});
  const [intentId, setIntentId] = useState<Hex | "">("");
  const [settlementAddressInput, setSettlementAddressInput] = useState<string>("");
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isShareCheckoutOpen, setIsShareCheckoutOpen] = useState(false);
  const [settlementAddress, setSettlementAddress] = useState<string>("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);
  const [checkoutMerchantName, setCheckoutMerchantName] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryEntry[]>([]);
  const [isLoadingPaymentHistory, setIsLoadingPaymentHistory] = useState(false);
  const [paidReceipt, setPaidReceipt] = useState<Hex | "">("");
  const walletLabel = useMemo(() => account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect wallet", [account]);

  useEffect(() => {
    if (account && !settlementAddressInput) {
      setSettlementAddressInput(account);
    }
  }, [account, settlementAddressInput]);

  useEffect(() => {
    if (view === "checkout" && merchantId && catalogue.length === 0) {
      loadCatalogue(true);
    }
  }, [view, merchantId]);

  useEffect(() => {
    if ((view === "asset" || view === "checkout") && merchantId && enabledAssetsList.length === 0) {
      loadEnabledAssets(true);
    }
  }, [view, merchantId]);

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,tether,weth,ripple,flare-networks&vs_currencies=usd")
      .then(res => res.json())
      .then(data => {
        setAssetPrices({
          USDC: data["usd-coin"]?.usd || 1,
          USDT: data["tether"]?.usd || 1,
          WETH: data["weth"]?.usd || 3200,
          FXRP: data["ripple"]?.usd || 0.6,
          C2FLR: data["flare-networks"]?.usd || 0.03,
          FASSET: 1
        });
      }).catch(() => {
        setAssetPrices({ USDC: 1, USDT: 1, WETH: 3200, FXRP: 0.6, C2FLR: 0.03, FASSET: 1 });
      });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlIntent = params.get("intentId");
      if (urlIntent && urlIntent.startsWith("0x")) {
        setIntentId(urlIntent as Hex);
        setView("pay");
      }
    }
  }, []);

  useEffect(() => {
    if (!intentId) {
      setPaymentDetails(null);
      setPaymentLines([]);
      setCheckoutMerchantName("");
      setPaidReceipt("");
      return;
    }
    const paymentIntentId = intentId;

    let cancelled = false;
    async function loadPaymentSummary() {
      try {
        const intent = await publicClient.readContract({ address: intrlinkAddress, abi: intrlinkAbi, functionName: "getPaymentIntent", args: [paymentIntentId] });
        const [merchant, cartLines] = await Promise.all([
          publicClient.readContract({ address: intrlinkAddress, abi: intrlinkAbi, functionName: "getMerchant", args: [intent.merchantId] }),
          publicClient.readContract({ address: intrlinkAddress, abi: intrlinkAbi, functionName: "getPaymentIntentCart", args: [paymentIntentId] }),
        ]);
        const lines = await Promise.all(cartLines.map(async (line) => {
          const item = await publicClient.readContract({ address: intrlinkAddress, abi: intrlinkAbi, functionName: "getMerchantItem", args: [intent.merchantId, line.itemId] });
          return { id: line.itemId, name: item.name || "Item", quantity: line.quantity, unitPriceMinor: line.unitPriceMinor };
        }));
        if (!cancelled) {
          setPaymentDetails({ merchantId: intent.merchantId, asset: intent.asset, fiatAmountMinor: intent.fiatAmountMinor, requiredAssetAmount: intent.requiredAssetAmount, expiresAt: intent.expiresAt, status: Number(intent.status) });
          setCheckoutMerchantName(merchant.companyName);
          setPaymentLines(lines);
        }
      } catch (error) {
        console.error("Could not load payment summary:", error);
      }
    }
    loadPaymentSummary();
    return () => { cancelled = true; };
  }, [intentId]);

  useEffect(() => {
    if (!account) {
      setBalance(null);
      return;
    }
    publicClient.getBalance({ address: account }).then(bal => {
      setBalance((Number(bal) / 1e18).toFixed(2));
    }).catch(console.error);
  }, [account]);


  useEffect(() => {
    if (!account) {
      setMerchantId("");
      setMerchantName("");
      setOwnerName("");
      setLocation("");
      setSettlementAddress("");
      setIsCheckingMerchant(false);
      return;
    }
    const merchantOwner = account;
    const cachedProfile = readMerchantProfileCache(merchantOwner);

    const applyMerchantProfile = (profile: MerchantProfileCache) => {
      setMerchantId(profile.merchantId);
      setMerchantName(profile.merchantName);
      setOwnerName(profile.ownerName);
      setLocation(profile.location);
      setSettlementAddress(profile.settlementAddress);
    };

    if (cachedProfile) {
      applyMerchantProfile(cachedProfile);
      if (!hasPaymentIntentInUrl()) setView("checkout");
    } else {
      setMerchantId("");
      setMerchantName("");
      setOwnerName("");
      setLocation("");
      setSettlementAddress("");
    }

    let cancelled = false;

    async function findMerchant() {
      setIsCheckingMerchant(!cachedProfile);
      try {
        const mId = await findMerchantIdByOwner(merchantOwner);
        if (mId) {
          const details = await publicClient.readContract({
            address: intrlinkAddress,
            abi: intrlinkAbi,
            functionName: "getMerchant",
            args: [mId]
          });
          if (!cancelled && details.exists) {
            const profile = {
              merchantId: mId,
              merchantName: details.companyName,
              ownerName: details.ownerName,
              location: details.location,
              settlementAddress: details.settlementAddress,
              updatedAt: Date.now(),
            } satisfies MerchantProfileCache;
            applyMerchantProfile(profile);
            writeMerchantProfileCache(merchantOwner, profile);
            if (!hasPaymentIntentInUrl()) setView("checkout");
            setIsCheckingMerchant(false);
            return;
          }
        }
        if (!cancelled) {
          clearMerchantProfileCache(merchantOwner);
          if (!cachedProfile) {
            setMerchantId("");
            setMerchantName("");
            setOwnerName("");
            setLocation("");
            setSettlementAddress("");
          }
        }
      } catch (err) {
        console.error("Failed to check merchant on-chain:", err);
      } finally {
        if (!cancelled) setIsCheckingMerchant(false);
      }
    }
    findMerchant();
    return () => { cancelled = true; };
  }, [account]);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    async function autoConnect(activeProvider: NonNullable<typeof provider>) {
      try {
        const accounts = await activeProvider.request({ method: "eth_accounts" }) as Address[];
        if (accounts && accounts.length > 0 && accounts[0]) {
          const activeAccount = await connectCoston2(activeProvider);
          setAccount(activeAccount);
          if (!hasPaymentIntentInUrl() && !readMerchantProfileCache(activeAccount)) setView("merchant");
        }
      } catch (error) {
        console.error("Auto-connect failed:", error);
      }
    }

    autoConnect(provider);

    const handleAccounts = (accounts: unknown) => {
      const accs = accounts as Address[];
      if (accs && accs.length > 0 && accs[0]) {
        setAccount(accs[0]);
        setSettlementAddressInput(accs[0]);
        if (!hasPaymentIntentInUrl() && !readMerchantProfileCache(accs[0])) setView("merchant");
      } else {
        setAccount(undefined);
        setSettlementAddressInput("");
        setView("merchant");
      }
    };

    const handleChain = () => {
      window.location.reload();
    };

    if (provider.on) {
      provider.on("accountsChanged", handleAccounts);
      provider.on("chainChanged", handleChain);
    }

    return () => {
      if (provider.removeListener) {
        provider.removeListener("accountsChanged", handleAccounts);
        provider.removeListener("chainChanged", handleChain);
      }
    };
  }, []);

  
  async function connectWallet() {
    const provider = getProvider();
    if (!provider) return toast.error("Install MetaMask or another EVM wallet to continue.");
    try {
      setBusy(true);
      const activeAccount = await connectCoston2(provider);
      setAccount(activeAccount);
      setSettlementAddressInput(activeAccount);
      if (!hasPaymentIntentInUrl() && !readMerchantProfileCache(activeAccount)) setView("merchant");
      toast.success("Wallet connected successfully");
    }
    catch (error) { toast.error(getErrMsg(error, "Could not connect wallet")); }
    finally { setBusy(false); }
  }

  async function sendWrite(functionName: "registerMerchant" | "addAsset" | "addAssets" | "addItem" | "createItemPaymentIntent" | "payNative" | "payToken" | "updateMerchantProfile" | "updateSettlementAddress" | "addItems" | "disableAsset" | "enableAsset" | "updateItem" | "setItemAvailability" | "createCartPaymentIntent" | "cancelIntent" | "expireIntent", args: readonly unknown[], value?: bigint) {
    const provider = getProvider();
    if (!provider || !account) throw new Error("Connect a wallet first.");
    const simulation = await publicClient.simulateContract({ account, address: intrlinkAddress, abi: intrlinkAbi, functionName, args: args as never, ...(value ? { value } : {}) } as never);
    const hash = await walletClient(provider, account).writeContract(simulation.request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Transaction reverted on-chain.");
    return hash;
  }

  async function updateMerchantProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!merchantId || !merchantName.trim() || !ownerName.trim() || !location.trim()) return toast.error("Complete all profile details.");
    try {
      setBusy(true);
      const hash = await sendWrite("updateMerchantProfile", [merchantId, merchantName.trim(), ownerName.trim(), location.trim()]);
      if (account) {
        writeMerchantProfileCache(account, {
          merchantId,
          merchantName: merchantName.trim(),
          ownerName: ownerName.trim(),
          location: location.trim(),
          settlementAddress: settlementAddress as Address,
          updatedAt: Date.now(),
        });
      }
      toast.success(`Profile updated: ${hash.slice(0, 10)}…`);
      setIsMerchantModalOpen(false);
      refreshAfterContractWrite();
    } catch (error) {
      toast.success(error instanceof Error ? error.message : "Profile update failed");
    } finally {
      setBusy(false);
    }
  }

  async function updateSettlementAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!merchantId || !isAddress(settlementAddress)) return toast.error("Enter a valid settlement address.");
    try {
      setBusy(true);
      const hash = await sendWrite("updateSettlementAddress", [merchantId, settlementAddress as Address]);
      if (account) {
        writeMerchantProfileCache(account, {
          merchantId,
          merchantName: merchantName.trim(),
          ownerName: ownerName.trim(),
          location: location.trim(),
          settlementAddress: settlementAddress as Address,
          updatedAt: Date.now(),
        });
      }
      toast.success(`Settlement address updated: ${hash.slice(0, 10)}…`);
      setIsMerchantModalOpen(false);
      refreshAfterContractWrite();
    } catch (error) {
      toast.success(error instanceof Error ? error.message : "Address update failed");
    } finally {
      setBusy(false);
    }
  }

  async function registerMerchant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !merchantName.trim() || !ownerName.trim() || !location.trim() || !isAddress(settlementAddressInput)) return toast.error("Complete all details correctly (verify settlement address).");
    const id = keccak256(stringToHex(`intrlink:merchant:${account.toLowerCase()}:${merchantName.trim().toLowerCase()}`));
    try {
      setBusy(true);
      const existingMerchant = await publicClient.readContract({
        address: intrlinkAddress,
        abi: intrlinkAbi,
        functionName: "getMerchant",
        args: [id],
      });
      if (existingMerchant.exists) {
        writeMerchantProfileCache(account, {
          merchantId: id,
          merchantName: existingMerchant.companyName,
          ownerName: existingMerchant.ownerName,
          location: existingMerchant.location,
          settlementAddress: existingMerchant.settlementAddress,
          updatedAt: Date.now(),
        });
        setMerchantId(id);
        setView("asset");
        toast.success("Merchant already registered. Continuing with the existing profile.");
        return;
      }
      const hash = await sendWrite("registerMerchant", [id, settlementAddressInput.trim() as Address, merchantName.trim(), ownerName.trim(), location.trim()]);
      writeMerchantProfileCache(account, {
        merchantId: id,
        merchantName: merchantName.trim(),
        ownerName: ownerName.trim(),
        location: location.trim(),
        settlementAddress: settlementAddressInput.trim() as Address,
        updatedAt: Date.now(),
      });
      setMerchantId(id);
      setView("asset");
      toast.success(`Merchant registered: ${hash.slice(0, 10)}…`);
      refreshAfterContractWrite();
    }
    catch (error) { toast.error(getErrMsg(error, "Merchant registration failed")); }
    finally { setBusy(false); }
  }



  async function enableSelectedAssets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!merchantId) return toast.error("A merchant ID is required before enabling assets.");
    const toEnable = SUPPORTED_ASSETS.filter((a) => selectedAssets.has(a.symbol));
    if (toEnable.length === 0) return toast.error("Tick at least one asset to enable.");
    setBusy(true);

    // Try atomic batch first (single tx, all-or-nothing)
    const assetInputs = toEnable.map((a) => ({
      asset: a.address,
      feedId: a.feedId,
      tokenDecimals: a.tokenDecimals,
      feedDecimals: a.feedDecimals,
    }));

    try {
      setEnablingProgress({ current: 1, total: 1 });
      const hash = await sendWrite("addAssets", [merchantId, assetInputs]);
      setEnablingProgress(null);
      setBusy(false);
      toast.success(`✓ ${toEnable.length} asset${toEnable.length === 1 ? "" : "s"} enabled: ${hash.slice(0, 10)}…`);
      loadEnabledAssets(true);
      setView("checkout");
      refreshAfterContractWrite();
    } catch (batchErr) {
      // Fallback: enable one-by-one (handles already-existing asset errors gracefully)
      toast.success(`Batch failed — trying individually: ${batchErr instanceof Error ? batchErr.message.slice(0, 60) : "error"}`);
      let enabled = 0;
      for (const assetDef of toEnable) {
        try {
          setEnablingProgress({ current: enabled + 1, total: toEnable.length });
          await sendWrite("addAsset", [merchantId, assetDef.address, assetDef.feedId, assetDef.tokenDecimals, assetDef.feedDecimals]);
          enabled++;
          toast.success(`✓ ${assetDef.symbol} enabled (${enabled}/${toEnable.length})`);
        } catch (err) {
          toast.success(`✗ ${assetDef.symbol}: ${err instanceof Error ? err.message.slice(0, 60) : "Failed"}`);
        }
      }
      setEnablingProgress(null);
      setBusy(false);
      loadEnabledAssets(true);
      if (enabled > 0) {
        setView("checkout");
        refreshAfterContractWrite();
      }
    }
  }

  function toggleAsset(symbol: string) {
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      next.has(symbol) ? next.delete(symbol) : next.add(symbol);
      return next;
    });
  }

  async function addItemsBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!merchantId) return toast.error("Enter a merchant ID.");
    
    const validItems = batchItems.filter(item => item.name.trim() && item.category.trim() && Number(item.price) > 0);
    if (validItems.length === 0) return toast.error("Please fill out at least one item completely.");

    try {
      setBusy(true);
      const itemsPayload = validItems.map(item => {
        const cents = Math.round(Number(item.price) * 100);
        const id = keccak256(stringToHex(`intrlink:item:${merchantId}:${item.name.trim().toLowerCase()}`));
        return { itemId: id, name: item.name.trim(), priceMinor: BigInt(cents), category: item.category.trim() };
      });

      if (itemsPayload.length === 1) {
         const i = itemsPayload[0];
         const hash = await sendWrite("addItem", [merchantId, i.itemId, i.name, i.priceMinor, i.category]);
         toast.success(`Item added: ${hash.slice(0, 10)}…`);
      } else {
         const hash = await sendWrite("addItems", [merchantId, itemsPayload]);
         toast.success(`Batch added ${itemsPayload.length} items: ${hash.slice(0, 10)}…`);
      }
      
      setBatchItems([{ name: "", price: "", category: "" }]);
      setIsAddItemModalOpen(false);
      loadCatalogue(true);
      refreshAfterContractWrite();
    } catch (error) {
      toast.error(getErrMsg(error, "Could not add items"));
    } finally {
      setBusy(false);
    }
  }

  async function loadEnabledAssets(silent = false) {
    if (!merchantId) return;
    try {
      const logs = await indexerClient.getLogs({ address: intrlinkAddress, event: assetEnabledEvent, args: { merchantId }, fromBlock: intrlinkDeploymentBlock });
      const assetAddresses = logs.flatMap((log) => log.args.asset ? [log.args.asset] : []);
      const uniqueAssets = Array.from(new Set(assetAddresses));
      setEnabledAssetsList(uniqueAssets as Address[]);
    } catch (error) {
      if (!silent) toast.error(getErrMsg(error, "Could not load enabled assets"));
    }
  }

  async function loadCatalogue(silent = false) {
    if (!merchantId) return !silent && toast.error("Enter a merchant ID first.");
    try {
      setBusy(true);
      const logs = await indexerClient.getLogs({ address: intrlinkAddress, event: itemAddedEvent, args: { merchantId }, fromBlock: intrlinkDeploymentBlock });
      const items = logs.flatMap((log) => log.args.itemId && log.args.name && log.args.priceMinor !== undefined && log.args.category ? [{ id: log.args.itemId, name: log.args.name, priceMinor: log.args.priceMinor, category: log.args.category }] : []);
      setCatalogue(items);
      if (!silent) toast.success(items.length ? `${items.length} item${items.length === 1 ? "" : "s"} loaded` : "No items found for this merchant.");
    } catch (error) { if (!silent) toast.error(getErrMsg(error, "Could not load catalogue")); }
    finally { setBusy(false); }
  }

  async function loadPaymentHistory() {
    if (!merchantId) return;
    try {
      setIsLoadingPaymentHistory(true);
      const latestBlock = await publicClient.getBlockNumber();
      const intentIds: { id: Hex; createdAt: bigint }[] = [];

      // IntrLink has no merchant-intent enumeration getter. The contract emits
      // PaymentIntentCreated(intentId, merchantId, ...) for every checkout, so
      // use that lifecycle event as the merchant's history index.
      for (let toBlock = latestBlock; toBlock >= intrlinkDeploymentBlock;) {
        const fromBlock = toBlock - (LOG_BLOCK_RANGE - BigInt(1)) > intrlinkDeploymentBlock
          ? toBlock - (LOG_BLOCK_RANGE - BigInt(1))
          : intrlinkDeploymentBlock;
        const logs = await publicClient.getLogs({ address: intrlinkAddress, fromBlock, toBlock });
        for (const log of logs) {
          if (log.topics[0] === PAYMENT_INTENT_CREATED_TOPIC && log.topics[2]?.toLowerCase() === merchantId.toLowerCase() && log.topics[1]) {
            intentIds.push({ id: log.topics[1] as Hex, createdAt: log.blockNumber ?? fromBlock });
          }
        }
        if (fromBlock === intrlinkDeploymentBlock) break;
        toBlock = fromBlock - BigInt(1);
      }

      const history = await Promise.all(intentIds.map(async ({ id, createdAt }) => {
        const intent = await publicClient.readContract({ address: intrlinkAddress, abi: intrlinkAbi, functionName: "getPaymentIntent", args: [id] });
        return { id, createdAt, merchantId: intent.merchantId, asset: intent.asset, fiatAmountMinor: intent.fiatAmountMinor, requiredAssetAmount: intent.requiredAssetAmount, expiresAt: intent.expiresAt, status: Number(intent.status) };
      }));
      setPaymentHistory(history.sort((a, b) => Number(b.createdAt - a.createdAt)));
    } catch (error) {
      console.error("Could not load payment history:", error);
      toast.error(getErrMsg(error, "Could not load payment history"));
    } finally {
      setIsLoadingPaymentHistory(false);
    }
  }

  async function createCartIntent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cartItems = Object.entries(cart).filter(([_, qty]) => qty > 0).map(([id, qty]) => ({ itemId: id as Hex, quantity: BigInt(qty) }));
    if (!merchantId || cartItems.length === 0 || !isAddress(asset)) return toast.error("Select at least one item and a payment asset.");
    const newIntentId = keccak256(stringToHex(`intrlink:intent:${crypto.randomUUID()}`));
    try {
      setBusy(true);
      await sendWrite("createCartPaymentIntent", [newIntentId, merchantId, cartItems, asset as Address, BigInt(Math.floor(Date.now() / 1000) + (expiryMinutes * 60)), "0x0000000000000000000000000000000000000000000000000000000000000000"]);
      const url = new URL(window.location.href);
      url.searchParams.set("intentId", newIntentId);
      setIntentId(newIntentId);
      setPaidReceipt("");
      setCheckoutUrl(url.toString());
      setIsCartDrawerOpen(false);
      setIsShareCheckoutOpen(false);
      setView("pay");
      window.history.pushState(null, "", `${url.pathname}${url.search}`);
      navigator.clipboard?.writeText(url.toString()).then(() => toast.success("Checkout link copied to clipboard!"));
      refreshAfterContractWrite();
    }
    catch (error) { toast.error(getErrMsg(error, "Could not create checkout")); }
    finally { setBusy(false); }
  }

  async function payIntent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intentId) return toast.error("Enter a payment intent ID.");
    try {
      setBusy(true);
      const intent = await publicClient.readContract({ address: intrlinkAddress, abi: intrlinkAbi, functionName: "getPaymentIntent", args: [intentId] });
      let hash: Hex;
      if (intent.asset === zeroAddress) hash = await sendWrite("payNative", [intentId], intent.requiredAssetAmount);
      else {
        const provider = getProvider(); if (!provider || !account) throw new Error("Connect a wallet first.");
        const allowance = await publicClient.readContract({ address: intent.asset, abi: erc20Abi, functionName: "allowance", args: [account, intrlinkAddress] });
        if (allowance < intent.requiredAssetAmount) {
          const approval = await publicClient.simulateContract({ account, address: intent.asset, abi: erc20Abi, functionName: "approve", args: [intrlinkAddress, intent.requiredAssetAmount] });
          const approvalHash = await walletClient(provider, account).writeContract(approval.request);
          if ((await publicClient.waitForTransactionReceipt({ hash: approvalHash })).status !== "success") throw new Error("Token approval reverted on-chain.");
        }
        hash = await sendWrite("payToken", [intentId]);
      }
      toast.success(`Payment settled: ${hash.slice(0, 10)}…`);
      setPaidReceipt(hash);
      refreshAfterContractWrite();
    } catch (error) { toast.error(getErrMsg(error, "Payment failed")); }
    finally { setBusy(false); }
  }

  function clearPaymentIntent() {
    setIntentId("");
    setPaymentDetails(null);
    setPaymentLines([]);
    setCheckoutMerchantName("");
    setCheckoutUrl("");
    setPaidReceipt("");
    window.history.pushState(null, "", window.location.pathname);
    setView(merchantId ? "checkout" : "merchant");
  }

  if (!account) return <main className="landing" id="top"><nav className="navbar"><Brand/><button className="connect-button" onClick={connectWallet} disabled={busy}>{busy ? "Connecting…" : "Connect wallet"}</button></nav><section className="empty-state"><span className="eyebrow">ON-CHAIN PAYMENTS, MADE SIMPLE</span><h1>Accept crypto.<br/><em>Keep your price in USD.</em></h1><p>Set up your catalogue, create a checkout, and receive payment directly in your wallet.</p><Link href="/docs" className="primary-button large" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Documentation</Link></section><Toaster position="bottom-right" /></main>;

  const cartItemsList = catalogue.filter(item => cart[item.id] > 0);
  const totalAmount = cartItemsList.reduce((acc, item) => acc + (Number(item.priceMinor)/100) * cart[item.id], 0);

  let localQuoteAmount = null;
  if (asset && isAddress(asset) && totalAmount > 0) {
    const selectedAssetDef = SUPPORTED_ASSETS.find(a => a.address.toLowerCase() === asset.toLowerCase());
    if (selectedAssetDef && assetPrices[selectedAssetDef.symbol]) {
      const cryptoTotal = totalAmount / assetPrices[selectedAssetDef.symbol];
      localQuoteAmount = `~ ${cryptoTotal.toFixed(6)} ${selectedAssetDef.symbol}`;
    }
  }
  const paymentLink = checkoutUrl || (intentId && typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?intentId=${intentId}` : "");
  const isMerchantPayment = Boolean(merchantId && paymentDetails && merchantId.toLowerCase() === paymentDetails.merchantId.toLowerCase());
  const isCustomerPaymentView = hasPaymentIntentInUrl() && !isMerchantPayment;
  const paymentAssetDefinition = paymentDetails && SUPPORTED_ASSETS.find((item) => item.address.toLowerCase() === paymentDetails.asset.toLowerCase());
  const quotedAssetAmount = paymentDetails && paymentAssetDefinition ? Number(paymentDetails.requiredAssetAmount) / 10 ** paymentAssetDefinition.tokenDecimals : null;
  const quotedRate = paymentDetails && quotedAssetAmount ? (Number(paymentDetails.fiatAmountMinor) / 100) / quotedAssetAmount : null;
  const paymentQuoteDetails = paymentDetails && paymentAssetDefinition && quotedAssetAmount !== null && quotedRate !== null ? <div className="payment-quote-details">
    <div><span>Payment asset</span><strong>{paymentAssetDefinition.symbol}</strong></div>
    <div><span>Amount due</span><strong>{quotedAssetAmount.toFixed(quotedAssetAmount < 0.01 ? 8 : 4)} {paymentAssetDefinition.symbol}</strong></div>
    <div><span>Conversion rate</span><strong>1 {paymentAssetDefinition.symbol} = ${quotedRate.toFixed(quotedRate < 0.01 ? 6 : 4)}</strong></div>
  </div> : null;
  const totalEarned = paymentHistory.filter((entry) => paymentStatus(entry.status, entry.expiresAt) === "Paid").reduce((total, entry) => total + entry.fiatAmountMinor, BigInt(0));

  return <main className="app" id="top"><nav className="navbar connected-nav"><div className="nav-inner"><div className="nav-identity"><Brand/>{merchantId && merchantName && <span className="merchant-nav-name">{merchantName}</span>}</div>{merchantId && enabledAssetsList.length > 0 && Object.keys(assetPrices).length > 0 && <div className="nav-ticker" style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--mint)', background: 'rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.15)' }}>{SUPPORTED_ASSETS.filter(a => enabledAssetsList.some(ea => ea.toLowerCase() === a.address.toLowerCase())).map(a => { const p = assetPrices[a.symbol]; if (!p) return null; const rate = 1 / p; const formatted = rate < 0.01 ? rate.toPrecision(3) : rate.toFixed(2); return <span key={a.symbol} style={{ fontWeight: 600 }}>{formatted} {a.symbol} / $1</span>; })}</div>}<div className="nav-actions">{merchantId && <button className="merchant-edit-btn" onClick={() => setIsMerchantModalOpen(true)}><ShopOutlined /> <span>Edit Merchant</span></button>}<button className="wallet-chip" onClick={() => navigator.clipboard?.writeText(account).then(() => toast.success("Wallet address copied"))} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>{balance !== null && <span style={{ opacity: 0.9 }}>{balance} C2FLR</span>}<span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '12px' }}><WalletOutlined style={{ opacity: 0.7 }} /> <span>{walletLabel}</span> <span>⎘</span></span></button><button className="disconnect-button" onClick={() => { setAccount(undefined); toast.success("Wallet disconnected"); }}>Disconnect</button></div></div></nav><section className="workspace">{view !== "checkout" && <header className="workspace-header"><h1>{view === "merchant" ? "Set up your merchant account" : view === "asset" ? "Choose what you accept" : view === "payments" ? "Payment history" : "Settle a checkout"}</h1><p>{view === "merchant" ? "Your wallet will receive payments directly." : view === "asset" ? "Enable the assets customers can use to pay you." : view === "payments" ? "Track every customer checkout and its on-chain status." : "Enter a payment intent to complete a customer payment."}</p></header>}<div className="view-tabs">{(["merchant", "asset", "checkout", "pay", "payments"] as View[]).filter((item) => !merchantId ? item === "merchant" : item !== "merchant").map((item) => <button className={view === item ? "selected" : ""} onClick={() => { setView(item); if (item === "payments") loadPaymentHistory(); }} key={item}>{item === "merchant" && <ShopOutlined />}{item === "asset" && <WalletOutlined />}{item === "checkout" && <ShoppingCartOutlined />}{(item === "pay" || item === "payments") && <CreditCardOutlined />}<span>{item === "asset" ? "Assets" : item === "checkout" ? "Checkout" : item === "payments" ? "Payments" : item === "pay" ? "Pay" : "Merchant"}</span></button>)}</div>
    {view === "pay" && !isCustomerPaymentView && <button type="button" className="clear-checkout-button" onClick={clearPaymentIntent}>Clear</button>}
    <div className="view-container">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          className={view === "checkout" || view === "payments" ? "items-container" : view === "pay" && isMerchantPayment ? "flow-card merchant-pay-flow" : "flow-card"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {view === "merchant" && (
            <form className="form-grid" onSubmit={registerMerchant}>
              {isCheckingMerchant && (
                <div className="full-width" style={{ marginBottom: "4px" }}>
                  <div style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.82)", borderRadius: "14px", padding: "12px 14px", fontSize: "14px" }}>
                    Checking for an existing merchant profile. You can review the form while verification finishes.
                  </div>
                </div>
              )}
              <Field label="Business name"><input value={merchantName} onChange={(e) => setMerchantName(e.target.value)} placeholder="My Store" required/></Field><Field label="Owner name"><input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Your name" required/></Field><div className="full-width"><Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" required/></Field></div><div className="full-width"><Field label="Settlement wallet address"><input value={settlementAddressInput} onChange={(e) => setSettlementAddressInput(e.target.value)} placeholder="0x..." required/></Field></div><div className="full-width register-submit-container"><button className="register-submit-btn" disabled={busy || isCheckingMerchant}>{isCheckingMerchant ? "Checking existing profile…" : busy ? "Submitting…" : "Submit"}</button></div>
            </form>
          )}
          {view === "asset" && (
            <div className="asset-view-container">
              <form className="asset-form" onSubmit={enableSelectedAssets}>
                {/* Asset multi-select dropdown */}
              <div className="asset-dropdown-field" ref={assetDropdownRef}>
                <span className="asset-list-label">Payment assets to accept</span>

                {/* Trigger */}
                <button
                  type="button"
                  className={`asset-dropdown-trigger${assetDropdownOpen ? " asset-dropdown-trigger--open" : ""}`}
                  onClick={() => setAssetDropdownOpen((o) => !o)}
                >
                  <span className="asset-trigger-content">
                    {selectedAssets.size === 0
                      ? <span className="asset-trigger-placeholder">Select assets…</span>
                      : <span className="asset-trigger-pills">
                          {Array.from(selectedAssets).map((sym) => (
                            <span key={sym} className="asset-pill">{sym}</span>
                          ))}
                        </span>
                    }
                  </span>
                  <span className={`asset-trigger-chevron${assetDropdownOpen ? " asset-trigger-chevron--up" : ""}`}>▾</span>
                </button>

                {/* Dropdown panel */}
                <AnimatePresence>
                  {assetDropdownOpen && (
                    <motion.div
                      className="asset-dropdown-panel"
                      initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: -4, scaleY: 0.97 }}
                      transition={{ duration: 0.15 }}
                      style={{ transformOrigin: "top" }}
                    >
                      {SUPPORTED_ASSETS.map((a: SupportedAsset, i) => {
                        const isAlreadyEnabled = enabledAssetsList.some(ea => ea.toLowerCase() === a.address.toLowerCase());
                        const checked = selectedAssets.has(a.symbol) || isAlreadyEnabled;
                        return (
                          <label
                            key={a.symbol}
                            className={`asset-list-row${checked && !isAlreadyEnabled ? " asset-list-row--checked" : ""}${i === SUPPORTED_ASSETS.length - 1 ? " asset-list-row--last" : ""}`}
                            htmlFor={`asset-${a.symbol}`}
                            style={isAlreadyEnabled ? { opacity: 0.4, cursor: "not-allowed", filter: "grayscale(100%) blur(0.5px)", backgroundColor: "var(--bg-secondary)" } : {}}
                          >
                            <input
                              id={`asset-${a.symbol}`}
                              type="checkbox"
                              className="asset-checkbox"
                              checked={checked}
                              disabled={isAlreadyEnabled}
                              onChange={() => toggleAsset(a.symbol)}
                            />
                            <span className="asset-row-symbol">{a.symbol}</span>
                            <span className="asset-row-name">{a.name}</span>
                            <span className="asset-row-badges">
                              {assetPrices[a.symbol] && (
                                <span style={{ color: '#1b5e20', fontSize: '12px', marginRight: '8px', fontWeight: 600 }}>
                                  ${assetPrices[a.symbol].toFixed(a.symbol === 'C2FLR' ? 4 : 2)}
                                </span>
                              )}
                              {a.symbol === "C2FLR" && <span className="asset-meta-badge asset-meta-native">Native</span>}
                              <span className="asset-meta-badge">{a.tokenDecimals}d</span>
                            </span>
                          </label>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="hint" style={{ marginTop: "4px" }}>
                <b>FTSOv2 verified assets.</b> Feed IDs are derived from the Flare oracle naming convention (category byte + hex-encoded name, padded to 21 bytes). Native C2FLR uses the zero address.
              </p>

              {/* Progress bar while enabling */}
              {enablingProgress && (
                <div className="enable-progress">
                  <div
                    className="enable-progress-bar"
                    style={{ width: `${(enablingProgress.current / enablingProgress.total) * 100}%` }}
                  />
                  <span>
                    {enablingProgress.total === 1 && selectedAssets.size > 1 
                      ? `Enabling ${selectedAssets.size} assets in 1 batch transaction…` 
                      : `${enablingProgress.current} of ${enablingProgress.total} assets enabled…`}
                  </span>
                </div>
              )}

              <button
                className="primary-button asset-submit-btn"
                disabled={busy || selectedAssets.size === 0}
              >
                {busy
                  ? enablingProgress
                    ? enablingProgress.total === 1 && selectedAssets.size > 1 
                      ? "Enabling Batch…" 
                      : `Enabling ${enablingProgress.current}/${enablingProgress.total}…`
                    : "Simulating…"
                  : selectedAssets.size === 0
                    ? "Select assets above"
                    : `Enable ${selectedAssets.size} asset${selectedAssets.size === 1 ? "" : "s"}`
                }
              </button>
            </form>

            {enabledAssetsList.length > 0 && (
              <div className="enabled-assets-section" style={{ marginTop: "32px", borderTop: "1px solid var(--border-color)", paddingTop: "24px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "var(--mint)", fontWeight: "600" }}>Currently Enabled Assets</h3>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {enabledAssetsList.map(a => {
                    const match = SUPPORTED_ASSETS.find(sa => sa.address.toLowerCase() === a.toLowerCase());
                    return (
                      <span key={a} className="asset-pill" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", opacity: 0.8 }}>
                        {match ? match.symbol : `${a.slice(0, 6)}…${a.slice(-4)}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          )}
          {view === "checkout" && (
            <div className="catalogue-view">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--forest)' }}>Your Catalogue</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="primary-button" onClick={() => setIsCartDrawerOpen(true)} style={{ background: '#1b5e20', color: '#fff', padding: '6px 12px', fontSize: '13px' }}>Proceed Checkout ({cartItemsList.length})</button>
                  <button type="button" className="primary-button" onClick={() => setIsAddItemModalOpen(true)} style={{ background: '#1b5e2015', color: 'var(--forest)', border: '1px solid #1b5e2030', padding: '6px 12px', fontSize: '13px' }}>+ Add new item</button>
                </div>
              </div>

              {catalogue.length > 0 ? (
                <div className="catalogue">
                  {catalogue.map((item) => (
                    <div className="catalogue-item" key={item.id}>
                      <div>
                        <b>{item.name}</b>
                        <small>{item.category}</small>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <strong>${(Number(item.priceMinor) / 100).toFixed(2)}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff50', padding: '4px', borderRadius: '20px', border: '1px solid #1b5e2020' }}>
                           <button type="button" onClick={() => setCart(c => ({ ...c, [item.id]: Math.max(0, (c[item.id] || 0) - 1) }))} style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: '#1b5e2015', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'var(--forest)' }}>-</button>
                           <span style={{ fontWeight: 600, minWidth: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--forest)' }}>{cart[item.id] || 0}</span>
                           <button type="button" onClick={() => setCart(c => ({ ...c, [item.id]: (c[item.id] || 0) + 1 }))} style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: '#1b5e20', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#fff' }}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ minHeight: 'auto', padding: '40px 20px', marginBottom: '32px' }}>
                  <p>No items found in your catalogue. Add an item to get started.</p>
                </div>
              )}

              <Drawer title="Proceed Checkout" placement="right" onClose={() => setIsCartDrawerOpen(false)} open={isCartDrawerOpen} width={420}>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {cartItemsList.length > 0 ? cartItemsList.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--forest)' }}>{item.name}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>${(Number(item.priceMinor)/100).toFixed(2)} x {cart[item.id]}</div>
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--forest)' }}>${((Number(item.priceMinor)/100) * cart[item.id]).toFixed(2)}</div>
                      </div>
                    )) : (
                      <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '40px' }}>Your cart is empty.</div>
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid #1b5e2030', paddingTop: '24px', marginTop: '24px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', marginBottom: '24px', color: 'var(--forest)', alignItems: 'flex-start' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                         <span>Total</span>
                         {localQuoteAmount && <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#f57c00' }}>{localQuoteAmount}</span>}
                       </div>
                       <span>${totalAmount.toFixed(2)}</span>
                     </div>
                     <form onSubmit={createCartIntent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                       <div style={{ display: 'flex', gap: '8px' }}>
                         <select value={asset} onChange={(e) => setAsset(e.target.value)} required style={{ flex: 1, padding: '12px 14px', borderRadius: '8px', border: '1px solid #1b5e2040', background: '#fff', color: 'var(--forest)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                           <option value="">Select payment asset...</option>
                           {SUPPORTED_ASSETS.filter((a) => enabledAssetsList.some((ea) => ea.toLowerCase() === a.address.toLowerCase())).map((a) => <option value={a.address} key={a.symbol}>{a.symbol} — {a.name}</option>)}
                         </select>
                         <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #1b5e2040', borderRadius: '8px', paddingRight: '12px' }}>
                           <input type="number" min="1" value={expiryMinutes} onChange={(e) => setExpiryMinutes(parseInt(e.target.value) || 1)} title="Quote validity in minutes" required style={{ width: '56px', padding: '12px 8px', border: 'none', background: 'transparent', color: 'var(--forest)', fontSize: '14px', outline: 'none', textAlign: 'center' }} />
                           <span style={{ color: 'var(--forest)', fontSize: '13px', opacity: 0.7, userSelect: 'none' }}>mins</span>
                         </div>
                       </div>
                       <button className="primary-button" disabled={busy || cartItemsList.length === 0} style={{ padding: '12px 24px', margin: 0, width: '100%' }}>
                         {busy ? "Simulating…" : `Checkout`}
                       </button>
                     </form>
                  </div>
                </div>
              </Drawer>
              <Drawer title="Share checkout" placement="right" onClose={() => setIsShareCheckoutOpen(false)} open={isShareCheckoutOpen} width={420}>
                <div className="share-checkout">
                  <p>Let your customer scan this code or send them the payment link.</p>
                  {checkoutUrl && <QRCode value={checkoutUrl} size={220} style={{ margin: "12px auto 24px", display: "block" }} />}
                  <label className="field-label">Payment link</label>
                  <div className="share-link-row">
                    <input value={checkoutUrl} readOnly aria-label="Payment link" />
                    <button type="button" className="primary-button" onClick={() => navigator.clipboard?.writeText(checkoutUrl).then(() => toast.success("Payment link copied"))}>Copy</button>
                  </div>
                  <p className="hint">The customer sees the itemized order and pays from their own wallet.</p>
                </div>
              </Drawer>
            </div>
          )}
          {view === "pay" && !paidReceipt && <form className={`form-grid${isCustomerPaymentView ? " customer-payment-view" : ""}`} onSubmit={payIntent}>
            {isMerchantPayment ? <div className="full-width merchant-payment-grid">
              {paymentDetails && <div className="payment-summary">
                <p className="eyebrow">PAYMENT REQUEST</p>
                <h2>{checkoutMerchantName || "Merchant checkout"}</h2>
                {paymentLines.length > 0 && <div className="payment-lines">{paymentLines.map((line) => <div key={line.id} className="payment-line"><span>{line.name} × {line.quantity.toString()}</span><strong>${(Number(line.unitPriceMinor * line.quantity) / 100).toFixed(2)}</strong></div>)}</div>}
                {paymentQuoteDetails}
                <div className="payment-total"><span>Total</span><strong>${(Number(paymentDetails.fiatAmountMinor) / 100).toFixed(2)}</strong></div>
                <p className="hint">Paying with {SUPPORTED_ASSETS.find((item) => item.address.toLowerCase() === paymentDetails.asset.toLowerCase())?.symbol ?? "the selected asset"}.</p>
              </div>}
              <div className="share-payment-card">
                <p className="eyebrow">SHARE WITH CUSTOMER</p>
                <h2>Payment link ready</h2>
                <p>Scan the QR code or copy the link to send this order to your customer.</p>
                {paymentLink && <QRCode value={paymentLink} size={180} style={{ margin: "16px auto", display: "block" }} />}
                <div className="share-link-row">
                  <input value={paymentLink} readOnly aria-label="Customer payment link" />
                  <button type="button" className="primary-button" onClick={() => navigator.clipboard?.writeText(paymentLink).then(() => toast.success("Payment link copied"))}>Copy link</button>
                </div>
              </div>
            </div> : <>
              {paymentDetails && <div className="full-width payment-summary">
                <p className="eyebrow">PAYMENT REQUEST</p>
                <h2>{checkoutMerchantName || "Merchant checkout"}</h2>
                {paymentLines.length > 0 && <div className="payment-lines">{paymentLines.map((line) => <div key={line.id} className="payment-line"><span>{line.name} × {line.quantity.toString()}</span><strong>${(Number(line.unitPriceMinor * line.quantity) / 100).toFixed(2)}</strong></div>)}</div>}
                {paymentQuoteDetails}
                <div className="payment-total"><span>Total</span><strong>${(Number(paymentDetails.fiatAmountMinor) / 100).toFixed(2)}</strong></div>
              </div>}
              <div className="full-width"><Field label="Payment intent ID"><input value={intentId} onChange={(e) => setIntentId(e.target.value as Hex)} placeholder="0x…" required/></Field></div>
              <p className="hint">We simulate the payment first. ERC-20 payments only request approval when necessary.</p>
              <button className="primary-button" disabled={busy || !paymentDetails}>{busy ? "Confirming…" : "Review and pay"}</button>
            </>}
          </form>}
          {view === "pay" && paidReceipt && <div className={`payment-receipt${isCustomerPaymentView ? " customer-payment-view" : ""}`}>
            <p className="eyebrow">PAYMENT SUCCESSFUL</p>
            <h2>Payment received</h2>
            <p>Your payment to {checkoutMerchantName || "the merchant"} was confirmed on-chain.</p>
            {paymentDetails && <div className="receipt-total"><span>Paid</span><strong>{quotedAssetAmount?.toFixed(quotedAssetAmount < 0.01 ? 8 : 4)} {paymentAssetDefinition?.symbol ?? ""} (${(Number(paymentDetails.fiatAmountMinor) / 100).toFixed(2)})</strong></div>}
            <a href={`https://coston2.testnet.flarescan.com/tx/${paidReceipt}`} target="_blank" rel="noreferrer">View transaction receipt</a>
          </div>}
          {view === "payments" && <div className="payment-history">
            <div className="payment-history-header">
              <button type="button" className="primary-button" onClick={loadPaymentHistory} disabled={isLoadingPaymentHistory}>{isLoadingPaymentHistory ? "Loading…" : "Refresh"}</button>
            </div>
            {isLoadingPaymentHistory ? <div className="payment-history-empty"><p>Loading payment history…</p></div> : paymentHistory.length === 0 ? <div className="payment-history-empty"><p>No checkouts created yet.</p></div> : <div className="payment-history-table">
              <div className="payment-history-row payment-history-head"><span>Checkout</span><span>Amount</span><span>Asset</span><span>Status</span></div>
              {paymentHistory.map((entry) => {
                const assetDefinition = SUPPORTED_ASSETS.find((item) => item.address.toLowerCase() === entry.asset.toLowerCase());
                const status = paymentStatus(entry.status, entry.expiresAt);
                return <div className="payment-history-row" key={entry.id}>
                  <button type="button" className="payment-id" onClick={() => navigator.clipboard?.writeText(entry.id).then(() => toast.success("Payment intent ID copied"))}>{entry.id.slice(0, 10)}…{entry.id.slice(-6)}</button>
                  <strong>${(Number(entry.fiatAmountMinor) / 100).toFixed(2)}</strong>
                  <span>{assetDefinition?.symbol ?? "Unknown"}</span>
                  <span className={`payment-status payment-status-${status.toLowerCase()}`}>{status}</span>
                </div>;
              })}
            </div>}
            {!isLoadingPaymentHistory && paymentHistory.length > 0 && <div className="payment-history-total"><span>Total earned from paid checkouts</span><strong>${(Number(totalEarned) / 100).toFixed(2)}</strong></div>}
          </div>}
        </motion.div>
      </AnimatePresence>
    </div>
      <AnimatePresence>
        {isAddItemModalOpen && (
          <div className="modal-overlay" onClick={() => setIsAddItemModalOpen(false)}>
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Add new item</h2>
                <button className="close-btn" onClick={() => setIsAddItemModalOpen(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <form className="form-grid modal-form" onSubmit={addItemsBatch}>
                  {batchItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'contents' }}>
                      {idx > 0 && <div className="full-width" style={{ height: '1px', background: 'var(--border-color)', margin: '16px 0' }} />}
                      <Field label={`Item name ${idx + 1}`}><input value={item.name} onChange={(e) => { const newArr = [...batchItems]; newArr[idx].name = e.target.value; setBatchItems(newArr); }} placeholder="Coffee" required={idx === 0}/></Field>
                      <Field label={`USD price ${idx + 1}`}><input type="number" min="0.01" step="0.01" value={item.price} onChange={(e) => { const newArr = [...batchItems]; newArr[idx].price = e.target.value; setBatchItems(newArr); }} placeholder="2.50" required={idx === 0}/></Field>
                      <div className="full-width">
                        <Field label={`Category ${idx + 1}`}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input style={{ flex: 1 }} value={item.category} onChange={(e) => { const newArr = [...batchItems]; newArr[idx].category = e.target.value; setBatchItems(newArr); }} placeholder="Drinks" required={idx === 0}/>
                            {batchItems.length > 1 && <button type="button" onClick={() => setBatchItems(batchItems.filter((_, i) => i !== idx))} style={{ padding: '0 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px' }} title="Remove item"><DeleteOutlined /></button>}
                          </div>
                        </Field>
                      </div>
                    </div>
                  ))}
                  
                  <div className="full-width" style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                     <button type="button" onClick={() => setBatchItems([...batchItems, { name: "", price: "", category: "" }])} style={{ background: 'none', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>+ Add item</button>
                  </div>
                  <div className="full-width"><p className="hint">Item prices are saved as USD cents on-chain.</p></div>
                  <button className="primary-button" disabled={busy}>{busy ? "Simulating…" : `Add ${batchItems.length} item${batchItems.length === 1 ? "" : "s"}`}</button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    <AnimatePresence>
      {isMerchantModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMerchantModalOpen(false)}>
          <motion.div
            className="modal-content"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Edit Merchant Profile</h2>
              <button className="close-btn" onClick={() => setIsMerchantModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={updateMerchantProfile} className="form-grid modal-form">
                <h3>Business Details</h3>
                <Field label="Business name"><input value={merchantName} onChange={(e) => setMerchantName(e.target.value)} required/></Field>
                <Field label="Owner name"><input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required/></Field>
                <div className="full-width"><Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} required/></Field></div>
                <button className="primary-button" disabled={busy}>{busy ? "Updating..." : "Update profile"}</button>
              </form>
              <hr className="modal-divider"/>
              <form onSubmit={updateSettlementAddress} className="form-grid modal-form">
                <h3>Payout Settlement Address</h3>
                <div className="full-width"><Field label="Settlement address"><input value={settlementAddress} onChange={(e) => setSettlementAddress(e.target.value)} required/></Field></div>
                <button className="primary-button" disabled={busy}>{busy ? "Updating..." : "Update settlement address"}</button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </section><Toaster position="bottom-right" /></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
