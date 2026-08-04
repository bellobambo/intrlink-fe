import Link from "next/link";
import React from "react";

export default function DocsPage() {
  return (
    <main className="app" id="top">
      <nav className="navbar" style={{ padding: "0 24px" }}>
        <Link href="/" className="brand" aria-label="Intrlink home" style={{ textDecoration: 'none' }}>
          <span className="brand-mark"><i/><i/><i/></span>
          <span>intrlink</span>
        </Link>
        <Link href="/" className="primary-button" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '14px' }}>
          Back to App
        </Link>
      </nav>

      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px 64px 24px' }}>
        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--spice)', marginBottom: '8px' }}>Intrlink Documentation</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>A Deep Dive into Intrlink: Decentralized, Non-Custodial, Fiat-Pegged POS Settlement.</p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--spice)', marginBottom: '12px' }}>1. Project Overview & Architecture</h2>
            <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)', fontSize: '1rem' }}>
              <strong>Intrlink</strong> is an advanced, non-custodial Point-of-Sale (POS) settlement protocol engineered exclusively for the Flare network. It solves one of the most critical barriers to cryptocurrency adoption in retail commerce: price volatility. 
              <br/><br/>
              By allowing merchants to price their goods and services strictly in fiat (e.g., USD minor units/cents) while receiving payments entirely in crypto (such as C2FLR, USDT, or FXRP), Intrlink eliminates merchant exposure to crypto price fluctuations at the point of sale. 
              <br/><br/>
              <strong>Target Audience:</strong> Real-world retail and online merchants who want to accept cryptocurrency without the accounting nightmare of price volatility, alongside crypto users seeking everyday utility for their digital assets.
              <br/><br/>
              Architecturally, Intrlink achieves its stability and decentralization by seamlessly integrating with Flare's powerful ecosystem:
            </p>
            <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', fontSize: '1rem', paddingLeft: '24px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>FTSOv2 Integration:</strong> We rely exclusively on the Flare Time Series Oracle for real-time exchange rates. Every checkout intent fetches live, highly accurate price data to convert fiat to exact crypto requirements on-chain.</li>
              <li><strong>Interoperability & FAssets:</strong> Intrlink inherently supports Flare's FAssets (like FXRP, FBTC), bringing real-world DeFi utility and spending power to tokens that previously lacked smart contract capabilities on their native chains.</li>
              <li><strong>EVM Execution:</strong> Deployed natively on the Flare network (currently live on the Coston2 Testnet), utilizing Flare's high-throughput EVM to route payments atomically and non-custodially. The <code>IntrLink.sol</code> smart contract acts purely as a settlement router and data validator—it never custodies user or merchant funds.</li>
            </ul>
            <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '16px' }}>
              Additionally, Intrlink features an <strong>AI-powered Copilot</strong> that acts as a merchant assistant. It allows merchants to analyze sales, summarize payments, and manage their storefront efficiently using natural language queries directly from the dashboard.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--spice)', marginBottom: '16px' }}>2. Core Smart Contract Functions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              
              <div style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-secondary)' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--spice)', marginBottom: '12px' }}>Merchant & Profile Management</h3>
                <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  <strong><code>registerMerchant</code></strong>: Registers a unique namespace for a merchant, establishing a public display profile and irrevocably binding a non-custodial settlement wallet address where all funds will be securely routed.<br/><br/>
                  <strong><code>updateMerchantProfile</code> / <code>updateSettlementAddress</code></strong>: Provides the merchant ongoing control to update their business information, physical location, and settlement destination dynamically on-chain.
                </p>
              </div>

              <div style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-secondary)' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--spice)', marginBottom: '12px' }}>Asset & Catalogue Configuration</h3>
                <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  <strong><code>addAsset</code> / <code>addAssets</code></strong>: Maps specific payment tokens (like C2FLR or ERC-20 FAssets) to their corresponding FTSOv2 price feed IDs (21-byte identifiers). This strict mapping guarantees that when a customer pays in a specific asset, the correct oracle data is referenced.<br/><br/>
                  <strong><code>addItem</code> / <code>addItems</code></strong>: Constructs the merchant's on-chain product catalogue. Item prices are rigidly stored in fiat minor units (e.g., $2.50 is stored as 250), shielding the catalogue from daily crypto market swings.
                </p>
              </div>

              <div style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-secondary)' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--spice)', marginBottom: '12px' }}>Payment Intents (Checkouts)</h3>
                <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  <strong><code>createPaymentIntent</code> / <code>createCartPaymentIntent</code></strong>: The core checkout mechanism. It aggregates the fiat value of selected items, validates the target payment asset's availability, and reads the FTSOv2 oracle to calculate the required crypto amount. This amount is permanently locked into the Intent until payment or expiration.<br/><br/>
                  <strong><code>cancelIntent</code> / <code>expireIntent</code></strong>: Prevents outdated, stale, or cancelled quotes from being settled, ensuring merchants never receive undervalued payments.
                </p>
              </div>

              <div style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-secondary)' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--spice)', marginBottom: '12px' }}>Atomic Settlement</h3>
                <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  <strong><code>payNative</code></strong>: Validates <code>msg.value</code> against the locked <code>requiredAssetAmount</code> for native token (C2FLR) payments, subsequently triggering a low-level call to push the native token straight to the merchant.<br/><br/>
                  <strong><code>payToken</code></strong>: Leverages <code>transferFrom</code> for ERC-20 and bridged FAssets. It verifies the payment against the Intent and atomically routes the approved tokens to the merchant's settlement wallet.
                </p>
              </div>

            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--spice)', marginBottom: '16px' }}>3. Detailed End-to-End User Flow</h2>
            <div style={{ paddingLeft: '20px', borderLeft: '3px solid var(--spice)' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--spice)', marginBottom: '8px', marginTop: '12px' }}>Step 1: Protocol Onboarding & Verification</h3>
              <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.95rem' }}>
                A merchant visits the dApp, connects their EVM wallet, and registers their profile via the <code>registerMerchant</code> function. This step is crucial as it binds their account to a specified settlement address, creating a secure, non-custodial pipeline for future revenue.
              </p>

              <h3 style={{ fontSize: '1.2rem', color: 'var(--spice)', marginBottom: '8px' }}>Step 2: Inventory & Oracle Setup</h3>
              <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.95rem' }}>
                The merchant populates their inventory using <code>addItem</code>, setting item names and hardcoded USD prices. Simultaneously, they call <code>addAsset</code> to enable verified assets (like USDT or FXRP). The contract rigorously validates these assets against the Flare Contract Registry to ensure reliable FTSOv2 price data can be fetched.
              </p>

              <h3 style={{ fontSize: '1.2rem', color: 'var(--spice)', marginBottom: '8px' }}>Step 3: Point-of-Sale Quote Generation</h3>
              <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.95rem' }}>
                When a customer is ready to check out, the dApp aggregates the selected items into a Cart. A transaction invokes <code>createCartPaymentIntent</code>, instructing the smart contract to fetch the latest oracle price. A fixed cryptocurrency quote is generated and locked into an immutable Payment Intent with a strictly enforced expiration timestamp.
              </p>

              <h3 style={{ fontSize: '1.2rem', color: 'var(--spice)', marginBottom: '8px' }}>Step 4: Non-Custodial Execution & Event Emission</h3>
              <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.95rem' }}>
                The customer reviews the live checkout link and clicks "Pay". Depending on the asset type, the contract routes the transaction through <code>payNative</code> or <code>payToken</code>. The exact amount is verified, the Intent is marked as PAID to prevent replay attacks, and funds are instantly transferred to the merchant. Finally, a <code>PaymentSettled</code> event is emitted, instantly updating the frontend UI to reflect a successful purchase.
              </p>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--spice)', marginBottom: '16px' }}>4. New Proposals & Next Steps</h2>
            <div style={{ paddingLeft: '20px', borderLeft: '3px solid var(--spice)' }}>
              <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.95rem' }}>
                <strong>Evidence of New Work:</strong> The entire Intrlink ecosystem—from the robust smart contract architecture (<code>IntrLink.sol</code>) down to the seamless React frontend merchant dashboard and checkout flows—was envisioned, designed, and built entirely from scratch to showcase the power of interoperable asset products on Flare.
              </p>

              <h3 style={{ fontSize: '1.2rem', color: 'var(--spice)', marginBottom: '8px' }}>Roadmap</h3>
              <ul style={{ lineHeight: '1.6', color: 'var(--text-secondary)', fontSize: '0.95rem', paddingLeft: '20px', margin: '0' }}>
                <li><strong>Flare Mainnet Deployment:</strong> Rolling out natively on Flare mainnet coinciding with FAsset mainnet readiness.</li>
                <li><strong>Merchant APIs:</strong> Comprehensive API and Webhook integrations to power automated accounting systems.</li>
                <li><strong>Hardware POS:</strong> Integrating standard physical POS terminal hardware for seamless in-store retail payments.</li>
                <li><strong>Recurring Billing:</strong> Subscription-based payment intents leveraging recurring oracle-checked billing cycles.</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--spice)', marginBottom: '12px' }}>Repositories & Contracts</h2>
            <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '6px' }}>
              <strong>Smart Contract (Coston2 Testnet):</strong> <a href="https://coston2-explorer.flare.network/address/0x2b7f7552E3B5902c2d1dAE65664ABE93F9d45795" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--spice)', textDecoration: 'underline' }}><code>0x2b7f7552E3B5902c2d1dAE65664ABE93F9d45795</code></a>
            </p>
            <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '6px' }}>
              <strong>Smart Contract Repo:</strong> <a href="https://github.com/bellobambo/intrlink" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--spice)', textDecoration: 'underline' }}>https://github.com/bellobambo/intrlink</a>
            </p>
            <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '0' }}>
              <strong>Frontend Repo:</strong> <a href="https://github.com/bellobambo/intrlink-fe" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--spice)', textDecoration: 'underline' }}>https://github.com/bellobambo/intrlink-fe</a>
            </p>
          </div>

        </div>
      </section>
    </main>
  );
}
