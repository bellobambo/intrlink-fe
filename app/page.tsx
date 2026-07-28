"use client";

import { FormEvent, useMemo, useState } from "react";
import { isAddress, keccak256, stringToHex, zeroAddress, type Address, type Hex } from "viem";
import { connectCoston2, erc20Abi, getProvider, intrlinkAbi, intrlinkAddress, itemAddedEvent, publicClient, walletClient } from "./lib/intrlink";

type View = "merchant" | "asset" | "items" | "checkout" | "pay";
type CatalogueItem = { id: Hex; name: string; priceMinor: bigint; category: string };

function Brand() {
  return <a className="brand" href="#top" aria-label="Intrlink home"><span className="brand-mark"><i/><i/><i/></span><span>intrlink</span></a>;
}

export default function Home() {
  const [account, setAccount] = useState<Address>();
  const [view, setView] = useState<View>("merchant");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [location, setLocation] = useState("");
  const [merchantId, setMerchantId] = useState<Hex | "">("");
  const [asset, setAsset] = useState<string>(zeroAddress);
  const [feedId, setFeedId] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState("18");
  const [feedDecimals, setFeedDecimals] = useState("5");
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<Hex | "">("");
  const [intentId, setIntentId] = useState<Hex | "">("");
  const walletLabel = useMemo(() => account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect wallet", [account]);

  function notify(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 3500); }

  async function connectWallet() {
    const provider = getProvider();
    if (!provider) return notify("Install MetaMask or another EVM wallet to continue.");
    try { setBusy(true); setAccount(await connectCoston2(provider)); notify("Connected to Flare Coston2"); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not connect wallet"); }
    finally { setBusy(false); }
  }

  async function sendWrite(functionName: "registerMerchant" | "addAsset" | "addItem" | "createItemPaymentIntent" | "payNative" | "payToken", args: readonly unknown[], value?: bigint) {
    const provider = getProvider();
    if (!provider || !account) throw new Error("Connect a wallet first.");
    const simulation = await publicClient.simulateContract({ account, address: intrlinkAddress, abi: intrlinkAbi, functionName, args: args as never, ...(value ? { value } : {}) } as never);
    const hash = await walletClient(provider, account).writeContract(simulation.request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Transaction reverted on-chain.");
    return hash;
  }

  async function registerMerchant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !merchantName.trim() || !ownerName.trim() || !location.trim()) return notify("Complete all business details.");
    const id = keccak256(stringToHex(`intrlink:merchant:${account.toLowerCase()}:${merchantName.trim().toLowerCase()}`));
    try { setBusy(true); const hash = await sendWrite("registerMerchant", [id, account, merchantName.trim(), ownerName.trim(), location.trim()]); setMerchantId(id); setView("asset"); notify(`Merchant registered: ${hash.slice(0, 10)}…`); }
    catch (error) { notify(error instanceof Error ? error.message : "Merchant registration failed"); }
    finally { setBusy(false); }
  }

  async function configureAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!merchantId || !isAddress(asset) || !/^0x[0-9a-fA-F]{42}$/.test(feedId.trim())) return notify("Enter a merchant ID, valid asset address, and 21-byte FTSOv2 feed ID.");
    const tokenPrecision = Number(tokenDecimals), oraclePrecision = Number(feedDecimals);
    if (![tokenPrecision, oraclePrecision].every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) return notify("Decimals must be whole numbers between 0 and 255.");
    try { setBusy(true); const hash = await sendWrite("addAsset", [merchantId, asset as Address, feedId.trim() as Hex, tokenPrecision, oraclePrecision]); setView("items"); notify(`Asset enabled: ${hash.slice(0, 10)}…`); }
    catch (error) { notify(error instanceof Error ? error.message : "Asset configuration failed"); }
    finally { setBusy(false); }
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!merchantId || !itemName.trim() || !itemCategory.trim()) return notify("Enter the merchant ID, item name, and category.");
    const cents = Math.round(Number(itemPrice) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) return notify("Enter a valid USD item price.");
    const id = keccak256(stringToHex(`intrlink:item:${merchantId}:${itemName.trim().toLowerCase()}`));
    try { setBusy(true); const hash = await sendWrite("addItem", [merchantId, id, itemName.trim(), BigInt(cents), itemCategory.trim()]); setCatalogue((items) => [...items, { id, name: itemName.trim(), priceMinor: BigInt(cents), category: itemCategory.trim() }]); setSelectedItemId(id); setItemName(""); setItemCategory(""); setItemPrice(""); notify(`Item added: ${hash.slice(0, 10)}…`); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not add item"); }
    finally { setBusy(false); }
  }

  async function loadCatalogue() {
    if (!merchantId) return notify("Enter a merchant ID first.");
    try {
      setBusy(true);
      const logs = await publicClient.getLogs({ address: intrlinkAddress, event: itemAddedEvent, args: { merchantId }, fromBlock: BigInt(33360332) });
      const items = logs.flatMap((log) => log.args.itemId && log.args.name && log.args.priceMinor !== undefined && log.args.category ? [{ id: log.args.itemId, name: log.args.name, priceMinor: log.args.priceMinor, category: log.args.category }] : []);
      setCatalogue(items); notify(items.length ? `${items.length} item${items.length === 1 ? "" : "s"} loaded` : "No items found for this merchant.");
    } catch (error) { notify(error instanceof Error ? error.message : "Could not load catalogue"); }
    finally { setBusy(false); }
  }

  async function createItemIntent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!merchantId || !selectedItemId || !isAddress(asset)) return notify("Choose an item and valid payment asset.");
    const id = keccak256(stringToHex(`intrlink:intent:${crypto.randomUUID()}`));
    try { setBusy(true); const hash = await sendWrite("createItemPaymentIntent", [id, merchantId, selectedItemId, asset as Address, BigInt(Math.floor(Date.now() / 1000) + 240), zeroAddress]); setIntentId(id); setView("pay"); notify(`Checkout ready: ${hash.slice(0, 10)}…`); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not create checkout"); }
    finally { setBusy(false); }
  }

  async function payIntent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intentId) return notify("Enter a payment intent ID.");
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
      notify(`Payment settled: ${hash.slice(0, 10)}…`);
    } catch (error) { notify(error instanceof Error ? error.message : "Payment failed"); }
    finally { setBusy(false); }
  }

  if (!account) return <main className="landing" id="top"><nav className="navbar"><Brand/><button className="connect-button" onClick={connectWallet} disabled={busy}>{busy ? "Connecting…" : "Connect wallet"}</button></nav><section className="empty-state"><span className="eyebrow">ON-CHAIN PAYMENTS, MADE SIMPLE</span><h1>Accept crypto.<br/><em>Keep your price in USD.</em></h1><p>Set up your catalogue, create a checkout, and receive payment directly in your wallet.</p><button className="primary-button large" onClick={connectWallet} disabled={busy}>{busy ? "Connecting…" : "Connect wallet"}<span>→</span></button><small>Flare Coston2 testnet</small></section>{notice && <Toast message={notice}/>}</main>;

  return <main className="app" id="top"><nav className="navbar connected-nav"><div className="nav-inner"><div className="nav-identity"><Brand/><span className="wallet-greeting">Connected to Coston2</span></div><div className="nav-actions"><button className="wallet-chip" onClick={() => navigator.clipboard?.writeText(account).then(() => notify("Wallet address copied"))}>{walletLabel} <span>⎘</span></button><button className="disconnect-button" onClick={() => { setAccount(undefined); notify("Wallet disconnected"); }}>Disconnect</button></div></div></nav><section className="workspace"><header className="workspace-header"><span className="eyebrow">FLARE COSTON2 · CHAIN 114</span><h1>{view === "merchant" ? "Set up your merchant account" : view === "asset" ? "Choose what you accept" : view === "items" ? "Build your catalogue" : view === "checkout" ? "Create an item checkout" : "Settle a checkout"}</h1><p>{view === "merchant" ? "Your wallet will receive payments directly." : view === "asset" ? "Enable the assets customers can use to pay you." : view === "items" ? "Add products with a USD price, ready for on-chain checkout." : view === "checkout" ? "Select a catalogue item and lock its live crypto price." : "Enter a payment intent to complete a customer payment."}</p></header><div className="view-tabs">{(["merchant", "asset", "items", "checkout", "pay"] as View[]).map((item) => <button className={view === item ? "selected" : ""} onClick={() => setView(item)} key={item}>{item === "asset" ? "Assets" : item === "items" ? "Catalogue" : item === "checkout" ? "Checkout" : item === "pay" ? "Pay" : "Merchant"}</button>)}</div>
    <div className="flow-card">
      {view === "merchant" && <form className="form-grid" onSubmit={registerMerchant}><Field label="Business name"><input value={merchantName} onChange={(e) => setMerchantName(e.target.value)} placeholder="My Store" required/></Field><Field label="Owner name"><input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Your name" required/></Field><Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" required/></Field><p className="hint">Settlement wallet <b>{account}</b></p><button className="primary-button" disabled={busy}>{busy ? "Waiting for wallet…" : "Register merchant"}<span>→</span></button></form>}
      {view === "asset" && <form className="form-grid" onSubmit={configureAsset}><Field label="Merchant ID"><input value={merchantId} onChange={(e) => setMerchantId(e.target.value as Hex)} placeholder="0x…" required/></Field><Field label="Asset address"><input value={asset} onChange={(e) => setAsset(e.target.value)} required/></Field><Field label="FTSOv2 feed ID"><input value={feedId} onChange={(e) => setFeedId(e.target.value)} placeholder="0x + 42 hex characters" required/></Field><Field label="Token decimals"><input type="number" value={tokenDecimals} onChange={(e) => setTokenDecimals(e.target.value)} required/></Field><Field label="Feed decimals"><input type="number" value={feedDecimals} onChange={(e) => setFeedDecimals(e.target.value)} required/></Field><p className="hint">Use the verified token and oracle feed configuration. Native C2FLR uses the zero address.</p><button className="primary-button" disabled={busy}>{busy ? "Simulating…" : "Enable asset"}<span>→</span></button></form>}
      {view === "items" && <><form className="form-grid" onSubmit={addItem}><Field label="Merchant ID"><input value={merchantId} onChange={(e) => setMerchantId(e.target.value as Hex)} placeholder="0x…" required/></Field><Field label="Item name"><input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Coffee" required/></Field><Field label="USD price"><input type="number" min="0.01" step="0.01" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} placeholder="2.50" required/></Field><Field label="Category"><input value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} placeholder="Drinks" required/></Field><p className="hint">Item prices are saved as USD cents on-chain.</p><button className="primary-button" disabled={busy}>{busy ? "Simulating…" : "Add item"}<span>→</span></button></form><button className="text-button" onClick={loadCatalogue} disabled={busy}>Load existing on-chain catalogue</button>{catalogue.length > 0 && <div className="catalogue">{catalogue.map((item) => <button className={selectedItemId === item.id ? "catalogue-item selected" : "catalogue-item"} onClick={() => { setSelectedItemId(item.id); setView("checkout"); }} key={item.id}><span><b>{item.name}</b><small>{item.category}</small></span><strong>${(Number(item.priceMinor) / 100).toFixed(2)}</strong></button>)}</div>}</>}
      {view === "checkout" && <form className="form-grid" onSubmit={createItemIntent}><Field label="Merchant ID"><input value={merchantId} onChange={(e) => setMerchantId(e.target.value as Hex)} placeholder="0x…" required/></Field><Field label="Catalogue item"><select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value as Hex)} required><option value="">Select an item</option>{catalogue.map((item) => <option value={item.id} key={item.id}>{item.name} — ${(Number(item.priceMinor) / 100).toFixed(2)}</option>)}</select></Field><Field label="Payment asset"><input value={asset} onChange={(e) => setAsset(e.target.value)} required/></Field><p className="hint">The quote lasts four minutes and uses the live Flare oracle price.</p><button className="primary-button" disabled={busy}>{busy ? "Simulating…" : "Create checkout"}<span>→</span></button></form>}
      {view === "pay" && <form className="form-grid" onSubmit={payIntent}><Field label="Payment intent ID"><input value={intentId} onChange={(e) => setIntentId(e.target.value as Hex)} placeholder="0x…" required/></Field><p className="hint">We simulate the payment first. ERC-20 payments only request approval when necessary.</p><button className="primary-button" disabled={busy}>{busy ? "Confirming…" : "Review and pay"}<span>→</span></button></form>}
    </div></section>{notice && <Toast message={notice}/>}</main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Toast({ message }: { message: string }) { return <div className="toast" role="status">{message}</div>; }
