# Intrlink

Intrlink is a decentralized, non-custodial Point-of-Sale (POS) settlement platform built for the Flare network. It empowers merchants to accept cryptocurrency payments (such as C2FLR, USDT, and FXRP) while pricing their catalogue entirely in USD.

By integrating seamlessly with Flare's FTSOv2 (Flare Time Series Oracle), Intrlink calculates real-time, highly accurate cryptocurrency exchange rates at the exact moment of checkout. This completely shields merchants from crypto price volatility, ensuring they receive the exact equivalent of their fiat price.

The platform is strictly non-custodial. All customer payments are routed directly and instantly to the merchant's predefined settlement wallet via the smart contract, eliminating intermediaries and settlement delays.

## Links & Repositories

- **Frontend Repository**: [https://github.com/bellobambo/intrlink-fe](https://github.com/bellobambo/intrlink-fe)
- **Smart Contract Repository**: [https://github.com/bellobambo/intrlink](https://github.com/bellobambo/intrlink)

## Getting Started

First, install dependencies and run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
