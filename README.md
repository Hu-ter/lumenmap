# Stellar Network Treemap

Interactive dashboard for exploring Stellar mainnet activity by contract, company/protocol, and operation category.

## Features

- Hierarchical treemap of network activity
- Daily, 7-day, 30-day, and monthly period filters
- Soroban contract volume and classic operation breakdown
- Entity labeling for known ecosystem actors
- KPI cards for total operations, Soroban share, top category, and active contracts
- Responsive dark UI optimized for desktop and mobile

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- D3 squarified treemap with drill-down navigation
- TanStack Query
- Hubble BigQuery

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). GCP credentials are required — see Hubble setup below.

## Hubble BigQuery Setup

1. Create a Google Cloud project.
2. Enable the BigQuery API.
3. Create a service account with BigQuery User permissions.
4. Copy `.env.example` to `.env.local` and set one of:
   - `GOOGLE_APPLICATION_CREDENTIALS=./gcp-sa.json`
   - `GCP_SERVICE_ACCOUNT_KEY=<base64-encoded-json>`

Public dataset: `crypto-stellar.crypto_stellar_dbt`

See the [Hubble connection guide](https://developers.stellar.org/docs/data/analytics/hubble/developer-guide/connecting-to-bigquery).

## API

`GET /api/activity?period=1d|7d|30d|month`

Returns aggregated categories, contracts, accounts, KPIs, and treemap tree data.

## Entity Registry

Known contracts and accounts are mapped in [`data/entities.json`](data/entities.json). Extend this file to label more ecosystem actors.

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — run ESLint

## Notes

- Hubble data is updated in intraday batches and may lag behind live network activity.
- BigQuery queries are cached in memory for 15 minutes by default.
- Query costs are reduced with date filters and top-N limits.
