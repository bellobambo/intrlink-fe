"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { isAddress, keccak256, stringToHex, zeroAddress, type Address, type Hex } from "viem";
import { connectCoston2, erc20Abi, getProvider, intrlinkAbi, intrlinkAddress, itemAddedEvent, publicClient, walletClient } from "./lib/intrlink";
import { ShopOutlined, WalletOutlined, AppstoreOutlined, ShoppingCartOutlined, CreditCardOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";


function getErrMsg(err: unknown, fallback: string) {
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
    feedDecimals: 5,
    description: "Native gas token of Coston2 testnet",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xC67DCE33D7A8efA5FfEB961899C73fe573f58e59" as Address, // Placeholder address
    feedId: "0x01555344432f55534400000000000000000000000000".slice(0, 44) as Hex, // USDC/USD — padded to bytes21
    tokenDecimals: 6,
    feedDecimals: 5,
    description: "USD-pegged stablecoin",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0x33A8e006C4cbBD4F695b50B20e89fb83aF3d59d4" as Address, // Placeholder address
    feedId: "0x01555344542f55534400000000000000000000000000".slice(0, 44) as Hex, // USDT/USD
    tokenDecimals: 6,
    feedDecimals: 5,
    description: "Tether USD stablecoin",
  },
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0x4A38E4A687e81b6EdA1D78C0b8aC1bFB0e6a76FF" as Address, // Placeholder address
    feedId: "0x014554482f55534400000000000000000000000000" as Hex, // ETH/USD
    tokenDecimals: 18,
    feedDecimals: 5,
    description: "Ethereum on Flare",
  },
  {
    symbol: "FXRP",
    name: "XRP Token",
    address: "0x4Fab3eA8C2e60c1EEa0Be4b6B08FBD34E8B35D9" as Address, // Placeholder address
    feedId: "0x015852502f55534400000000000000000000000000" as Hex, // XRP/USD
    tokenDecimals: 6,
    feedDecimals: 5,
    description: "XRP bridged to Flare",
  },
] as const;

type SupportedAsset = typeof SUPPORTED_ASSETS[number];

type View = "merchant" | "asset" | "items" | "checkout" | "pay";
type CatalogueItem = { id: Hex; name: string; priceMinor: bigint; category: string };

function Brand() {
  return <a className="brand" href="#top" aria-label="Intrlink home"><span className="brand-mark"><i/><i/><i/></span><span>intrlink</span></a>;
}

export default function Home() {
  const [account, setAccount] = useState<Address>();
  const [view, setView] = useState<View>("merchant");
  const [busy, setBusy] = useState(false);
    const [merchantName, setMerchantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [location, setLocation] = useState("");
  const [merchantId, setMerchantId] = useState<Hex | "">("");
  const [asset, setAsset] = useState<string>(zeroAddress);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [enablingProgress, setEnablingProgress] = useState<{ current: number; total: number } | null>(null);
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
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
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<Hex | "">("");
  const [intentId, setIntentId] = useState<Hex | "">("");
  const [settlementAddressInput, setSettlementAddressInput] = useState<string>("");
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [settlementAddress, setSettlementAddress] = useState<string>("");
  const walletLabel = useMemo(() => account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect wallet", [account]);

  useEffect(() => {
    if (account && !settlementAddressInput) {
      setSettlementAddressInput(account);
    }
  }, [account, settlementAddressInput]);

  useEffect(() => {
    if (view === "items" && merchantId && catalogue.length === 0) {
      loadCatalogue(true);
    }
  }, [view, merchantId]);

  useEffect(() => {
    if (!account) {
      setMerchantId("");
      return;
    }
    async function findMerchant() {
      try {
        const logs = await publicClient.getLogs({
          address: intrlinkAddress,
          event: {
            type: "event",
            name: "MerchantRegistered",
            inputs: [
              { name: "merchantId", type: "bytes32", indexed: true },
              { name: "owner", type: "address", indexed: true },
              { name: "settlementAddress", type: "address", indexed: false }
            ]
          } as const,
          args: { owner: account },
          fromBlock: BigInt(33360332)
        });
        if (logs && logs.length > 0 && logs[0].args.merchantId) {
          const mId = logs[0].args.merchantId;
          setMerchantId(mId);
          
          const details = await publicClient.readContract({
            address: intrlinkAddress,
            abi: intrlinkAbi,
            functionName: "getMerchant",
            args: [mId]
          });
          if (details && details.exists) {
            setMerchantName(details.companyName);
            setOwnerName(details.ownerName);
            setLocation(details.location);
            setSettlementAddress(details.settlementAddress);
          }
        }
      } catch (err) {
        console.error("Failed to check merchant on-chain:", err);
      }
    }
    findMerchant();
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
          setView("items");
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
        setView("items");
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
      setView("items");
      toast.success("Wallet connected successfully");
    }
    catch (error) { toast.error(getErrMsg(error, "Could not connect wallet")); }
    finally { setBusy(false); }
  }

  async function sendWrite(functionName: "registerMerchant" | "addAsset" | "addAssets" | "addItem" | "createItemPaymentIntent" | "payNative" | "payToken" | "updateMerchantProfile" | "updateSettlementAddress", args: readonly unknown[], value?: bigint) {
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
      toast.success(`Profile updated: ${hash.slice(0, 10)}…`);
      setIsMerchantModalOpen(false);
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
      toast.success(`Settlement address updated: ${hash.slice(0, 10)}…`);
      setIsMerchantModalOpen(false);
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
    try { setBusy(true); const hash = await sendWrite("registerMerchant", [id, settlementAddressInput.trim() as Address, merchantName.trim(), ownerName.trim(), location.trim()]); setMerchantId(id); setView("asset"); toast.success(`Merchant registered: ${hash.slice(0, 10)}…`); }
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
      setView("items");
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
      if (enabled > 0) setView("items");
    }
  }

  function toggleAsset(symbol: string) {
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      next.has(symbol) ? next.delete(symbol) : next.add(symbol);
      return next;
    });
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!merchantId || !itemName.trim() || !itemCategory.trim()) return toast.error("Enter the merchant ID, item name, and category.");
    const cents = Math.round(Number(itemPrice) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) return toast.error("Enter a valid USD item price.");
    const id = keccak256(stringToHex(`intrlink:item:${merchantId}:${itemName.trim().toLowerCase()}`));
    try { setBusy(true); const hash = await sendWrite("addItem", [merchantId, id, itemName.trim(), BigInt(cents), itemCategory.trim()]); setCatalogue((items) => [...items, { id, name: itemName.trim(), priceMinor: BigInt(cents), category: itemCategory.trim() }]); setSelectedItemId(id); setItemName(""); setItemCategory(""); setItemPrice(""); toast.success(`Item added: ${hash.slice(0, 10)}…`); }
    catch (error) { toast.error(getErrMsg(error, "Could not add item")); }
    finally { setBusy(false); }
  }

  async function loadCatalogue(silent = false) {
    if (!merchantId) return !silent && toast.error("Enter a merchant ID first.");
    try {
      setBusy(true);
      const logs = await publicClient.getLogs({ address: intrlinkAddress, event: itemAddedEvent, args: { merchantId }, fromBlock: BigInt(33360332) });
      const items = logs.flatMap((log) => log.args.itemId && log.args.name && log.args.priceMinor !== undefined && log.args.category ? [{ id: log.args.itemId, name: log.args.name, priceMinor: log.args.priceMinor, category: log.args.category }] : []);
      setCatalogue(items);
      if (!silent) toast.success(items.length ? `${items.length} item${items.length === 1 ? "" : "s"} loaded` : "No items found for this merchant.");
    } catch (error) { if (!silent) toast.error(getErrMsg(error, "Could not load catalogue")); }
    finally { setBusy(false); }
  }

  async function createItemIntent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!merchantId || !selectedItemId || !isAddress(asset)) return toast.error("Choose an item and valid payment asset.");
    const id = keccak256(stringToHex(`intrlink:intent:${crypto.randomUUID()}`));
    try { setBusy(true); const hash = await sendWrite("createItemPaymentIntent", [id, merchantId, selectedItemId, asset as Address, BigInt(Math.floor(Date.now() / 1000) + 240), zeroAddress]); setIntentId(id); setView("pay"); toast.success(`Checkout ready: ${hash.slice(0, 10)}…`); }
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
    } catch (error) { toast.error(getErrMsg(error, "Payment failed")); }
    finally { setBusy(false); }
  }

  if (!account) return <main className="landing" id="top"><nav className="navbar"><Brand/><button className="connect-button" onClick={connectWallet} disabled={busy}>{busy ? "Connecting…" : "Connect wallet"}</button></nav><section className="empty-state"><span className="eyebrow">ON-CHAIN PAYMENTS, MADE SIMPLE</span><h1>Accept crypto.<br/><em>Keep your price in USD.</em></h1><p>Set up your catalogue, create a checkout, and receive payment directly in your wallet.</p><button className="primary-button large" onClick={connectWallet} disabled={busy}>{busy ? "Connecting…" : "Connect wallet"}</button></section><Toaster position="bottom-right" /></main>;

  return <main className="app" id="top"><nav className="navbar connected-nav"><div className="nav-inner"><div className="nav-identity"><Brand/>{merchantId && merchantName && <span className="merchant-nav-name">{merchantName}</span>}</div><div className="nav-actions">{merchantId && <button className="merchant-edit-btn" onClick={() => setIsMerchantModalOpen(true)}><ShopOutlined /> <span>Edit Merchant</span></button>}<button className="wallet-chip" onClick={() => navigator.clipboard?.writeText(account).then(() => toast.success("Wallet address copied"))}>{walletLabel} <span>⎘</span></button><button className="disconnect-button" onClick={() => { setAccount(undefined); toast.success("Wallet disconnected"); }}>Disconnect</button></div></div></nav><section className="workspace">{view !== "items" && <header className="workspace-header"><h1>{view === "merchant" ? "Set up your merchant account" : view === "asset" ? "Choose what you accept" : view === "checkout" ? "Create an item checkout" : "Settle a checkout"}</h1><p>{view === "merchant" ? "Your wallet will receive payments directly." : view === "asset" ? "Enable the assets customers can use to pay you." : view === "checkout" ? "Select a catalogue item and lock its live crypto price." : "Enter a payment intent to complete a customer payment."}</p></header>}<div className="view-tabs">{(["merchant", "asset", "items", "checkout", "pay"] as View[]).filter((item) => !merchantId ? item === "merchant" : item !== "merchant").map((item) => <button className={view === item ? "selected" : ""} onClick={() => setView(item)} key={item}>{item === "merchant" && <ShopOutlined />}{item === "asset" && <WalletOutlined />}{item === "items" && <AppstoreOutlined />}{item === "checkout" && <ShoppingCartOutlined />}{item === "pay" && <CreditCardOutlined />}<span>{item === "asset" ? "Assets" : item === "items" ? "Catalogue" : item === "checkout" ? "Checkout" : item === "pay" ? "Pay" : "Merchant"}</span></button>)}</div>
    <div className="view-container">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          className={view === "items" ? "items-container" : "flow-card"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {view === "merchant" && <form className="form-grid" onSubmit={registerMerchant}><Field label="Business name"><input value={merchantName} onChange={(e) => setMerchantName(e.target.value)} placeholder="My Store" required/></Field><Field label="Owner name"><input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Your name" required/></Field><div className="full-width"><Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" required/></Field></div><div className="full-width"><Field label="Settlement wallet address"><input value={settlementAddressInput} onChange={(e) => setSettlementAddressInput(e.target.value)} placeholder="0x..." required/></Field></div><div className="full-width register-submit-container"><button className="register-submit-btn" disabled={busy}>{busy ? "Submitting…" : "Submit"}</button></div></form>}
          {view === "asset" && (
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
                        const checked = selectedAssets.has(a.symbol);
                        return (
                          <label
                            key={a.symbol}
                            className={`asset-list-row${checked ? " asset-list-row--checked" : ""}${i === SUPPORTED_ASSETS.length - 1 ? " asset-list-row--last" : ""}`}
                            htmlFor={`asset-${a.symbol}`}
                          >
                            <input
                              id={`asset-${a.symbol}`}
                              type="checkbox"
                              className="asset-checkbox"
                              checked={checked}
                              onChange={() => toggleAsset(a.symbol)}
                            />
                            <span className="asset-row-symbol">{a.symbol}</span>
                            <span className="asset-row-name">{a.name}</span>
                            <span className="asset-row-badges">
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
                  <span>{enablingProgress.current} of {enablingProgress.total} assets enabled…</span>
                </div>
              )}

              <button
                className="primary-button asset-submit-btn"
                disabled={busy || selectedAssets.size === 0}
              >
                {busy
                  ? enablingProgress
                    ? `Enabling ${enablingProgress.current}/${enablingProgress.total}…`
                    : "Simulating…"
                  : selectedAssets.size === 0
                    ? "Select assets above"
                    : `Enable ${selectedAssets.size} asset${selectedAssets.size === 1 ? "" : "s"}`
                }
              </button>


            </form>
          )}
          {view === "items" && (
            <div className="catalogue-view">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button type="button" className="primary-button" onClick={() => setIsAddItemModalOpen(true)}>Add item(s)</button>
              </div>
              {catalogue.length > 0 ? (
                <div className="catalogue">
                  {catalogue.map((item) => (
                    <button className={selectedItemId === item.id ? "catalogue-item selected" : "catalogue-item"} onClick={() => { setSelectedItemId(item.id); setView("checkout"); }} key={item.id}>
                      <span><b>{item.name}</b><small>{item.category}</small></span>
                      <strong>${(Number(item.priceMinor) / 100).toFixed(2)}</strong>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ minHeight: 'auto', padding: '40px 20px' }}>
                  <p>No items found in your catalogue. Add an item to get started.</p>
                </div>
              )}
            </div>
          )}
          {view === "checkout" && <form className="form-grid" onSubmit={createItemIntent}><div className="full-width"><Field label="Catalogue item"><select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value as Hex)} required><option value="">Select an item</option>{catalogue.map((item) => <option value={item.id} key={item.id}>{item.name} — ${(Number(item.priceMinor) / 100).toFixed(2)}</option>)}</select></Field></div><div className="full-width"><Field label="Payment asset"><select value={asset} onChange={(e) => setAsset(e.target.value)} required><option value="">Select an asset</option>{SUPPORTED_ASSETS.map((a) => <option value={a.address} key={a.symbol}>{a.symbol} — {a.name}</option>)}</select></Field></div><p className="hint">The quote lasts four minutes and uses the live Flare oracle price.</p><button className="primary-button" disabled={busy}>{busy ? "Simulating…" : "Create checkout"}</button></form>}
          {view === "pay" && <form className="form-grid" onSubmit={payIntent}><div className="full-width"><Field label="Payment intent ID"><input value={intentId} onChange={(e) => setIntentId(e.target.value as Hex)} placeholder="0x…" required/></Field></div><p className="hint">We simulate the payment first. ERC-20 payments only request approval when necessary.</p><button className="primary-button" disabled={busy}>{busy ? "Confirming…" : "Review and pay"}</button></form>}
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
                <form className="form-grid modal-form" onSubmit={async (e) => {
                  await addItem(e);
                  loadCatalogue(true); // refresh catalogue after adding
                }}>

                  <Field label="Item name"><input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Coffee" required/></Field>
                  <Field label="USD price"><input type="number" min="0.01" step="0.01" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} placeholder="2.50" required/></Field>
                  <div className="full-width"><Field label="Category"><input value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} placeholder="Drinks" required/></Field></div>
                  <div className="full-width"><p className="hint">Item prices are saved as USD cents on-chain.</p></div>
                  <button className="primary-button" disabled={busy}>{busy ? "Simulating…" : "Add item"}</button>
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
                <Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} required/></Field>
                <button className="primary-button" disabled={busy}>{busy ? "Updating..." : "Update profile"}</button>
              </form>
              <hr className="modal-divider"/>
              <form onSubmit={updateSettlementAddress} className="form-grid modal-form">
                <h3>Payout Settlement Address</h3>
                <Field label="Settlement address"><input value={settlementAddress} onChange={(e) => setSettlementAddress(e.target.value)} required/></Field>
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
