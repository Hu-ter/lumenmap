# LumenMap

**Stellar network activity dashboard.** Block explorers list transactions one by one. LumenMap shows what the network is doing as a whole: operation activity, top dApps, and how activity splits across payments, DEX, Soroban, and more.

> Open source · [github.com/lumenmap](https://github.com/lumenmap) · Version: **0.1**

## What you see

| Question | Answer in LumenMap |
| --- | --- |
| How busy is the network? | Total operations for the day, week, or month |
| What is happening on chain? | Share of payments, DEX, Soroban, trustlines, and account ops |
| Which accounts drive activity? | Top source accounts by operation count, with known names where available |
| Which dApps are used most? | Top Soroban contracts and protocols, ranked and drillable |
| What does this address mean? | Labels from the entity registry, Stellar Expert, and Hubble metadata |

The treemap is the center of the product. Tile size is share of operation activity. Color is category. Click to go from broad categories down to specific wallets and contracts.

## Why not just use an explorer?

Explorers are built to look up a single address or transaction. LumenMap is built to read the network at a glance and then zoom in. It groups raw operations into categories, ranks the actors behind them, and surfaces the few numbers that matter before you ever open a block detail page.

---

## Current version

Single-page dashboard. Data comes from [Hubble](https://developers.stellar.org/docs/data/analytics/hubble) on BigQuery. Definitions, coverage rules, and limitations are in the [versioned metric methodology](docs/metric-methodology.md).

### Available now

- Hierarchical treemap with D3 squarified layout, drill-down, and breadcrumbs
- Two views: **Operation Types** and **Accounts & Contracts**
- Period filters: 1 day, 7 days, 30 days, calendar month
- KPI cards: total operations, Soroban share, top category, active contracts (top-200 observed contracts)
- Entity labels for known wallets and contracts
- Detail panel with share, activity count, protocol, and address
- Responsive dark layout

### Coming next

- Daily and hourly operation trend charts
- Unique active wallet counts
- dApp leaderboard grouped by protocol
- Search by address, contract, or protocol
- Payment volume in XLM and USDC
- Public API

Operation count is available today. Transaction count, active-account count, payment volume, and TVL are not. See the [metric methodology](docs/metric-methodology.md) before comparing metrics.

---

## Roadmap

### Phase 1: Activity charts

- Operation and transaction counts over time
- Soroban vs classic share trends
- Sparklines on KPI cards
- `GET /api/v1/timeseries`

### Phase 2: Wallets and dApps

- Unique active accounts per period
- Top senders and receivers
- Soroban contracts grouped and labeled by protocol
- Search and filter
- Links out to Stellar Expert and Stellarscan

### Phase 3: Treemap depth

- Larger entity registry via `sync:directory` and manual entries
- Payment volume next to operation counts
- Soroban function breakdown per contract
- Testnet support

### Phase 4: Product polish

- Pages: Overview, Activity, Charts
- Headline summary: today’s tx count, active wallets, top dApp
- Public `/api/v1/activity` and `/api/v1/timeseries` with documentation

### Phase 5: Production

- Redis or KV cache instead of in-memory server cache
- BigQuery cost tuning
- Broader protocol coverage for anchors, DeFi, and issuers

---

## Architecture

```text
Browser
  → GET /api/v1/activity?period=1d|7d|30d|month
  → app/api/activity/_handler.ts (shared by /api/v1/activity and /api/activity)
  → lib/hubble/activity.ts
      → BigQuery queries
      → in-memory cache, 15 min TTL
      → lib/entities/build-treemap.ts
  → labels from entities.json, Stellar Expert, Hubble home_domain
```

Dataset: `crypto-stellar.crypto_stellar_dbt`

### Queries today

| Query | Output |
| --- | --- |
| Operations by type | Counts per `type_string` |
| Top accounts | Most active wallets per operation type |
| Top contracts | Most invoked Soroban contracts |
| Soroban functions | Counts per function and per contract |

### Queries planned

| Metric | Source |
| --- | --- |
| Daily operation time series | Hubble hourly aggregates |
| Unique active wallets | `enriched_history_operations` |
| dApps by protocol | `entities.json` and contract grouping |
| Payment volume | Hubble amount fields |

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org/) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Treemap | [d3-hierarchy](https://github.com/d3/d3-hierarchy) |
| Charts | Recharts or Visx |
| Data fetching | [TanStack Query](https://tanstack.com/query) |
| Analytics | [Hubble](https://developers.stellar.org/docs/data/analytics/hubble) / BigQuery |

---

## Getting started

### Prerequisites

- Node.js 20.x (use `nvm use` to activate the version in `.nvmrc`)
- Google Cloud project with BigQuery API enabled
- Service account with BigQuery User role

### Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set GCP credentials in `.env.local`, then open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Description |
| --- | --- |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON |
| `GCP_SERVICE_ACCOUNT_KEY` | Base64-encoded service account JSON |
| `CACHE_TTL_SECONDS` | Cache TTL in seconds. Supported range: 1–86,400. Default: 900 (invalid, negative, zero, or over-limit values fall back to default) |

Setup guide: [Hubble BigQuery connection](https://developers.stellar.org/docs/data/analytics/hubble/developer-guide/connecting-to-bigquery).

Do not commit `gcp-sa.json` or `.env.local`. Both are gitignored. Each contributor needs their own GCP credentials.

---

## API

### `GET /api/v1/activity`

Versioned activity and treemap data. This is the stable public contract. New
metrics and schema additions within v1 will be additive only.

| Param | Values | Default |
| --- | --- | --- |
| `period` | `1d`, `7d`, `30d`, `month` | `1d` |

#### Success response (`200`)

```json
{
  "period": "1d",
  "start": "2026-07-29T00:00:00.000Z",
  "end": "2026-07-29T23:59:59.999Z",
  "source": "hubble",
  "sourceTimestamp": "2026-07-29T22:45:00.000Z",
  "isPeriodComplete": false,
  "kpis": {
    "totalOps": 1234567,
    "sorobanShare": 0.42,
    "topCategory": "soroban",
    "activeContracts": 89
  },
  "treemaps": {
    "events": { "name": "Network Activity", "children": [] },
    "actors": { "name": "Accounts & Contracts", "children": [] },
    "xlm_events": { "name": "Network Activity", "children": [] },
    "xlm_actors": { "name": "Accounts & Contracts", "children": [] }
  },
  "categories": [],
  "contracts": [],
  "accounts": [],
  "sorobanFunctions": [],
  "sorobanFunctionContracts": []
}
```

Responses are cached for 15 minutes (`Cache-Control: public, max-age=900, s-maxage=900`).

#### Error responses

| Status | Body | Condition |
| --- | --- | --- |
| `400` | `{ "code": "INVALID_PERIOD", "message": "Unsupported activity period.", "supported": ["1d", "7d", "30d", "month"] }` | `period` query param is present but not one of the supported values |
| `500` | `{ "code": "INTERNAL_ERROR", "message": "An unexpected error occurred. Please try again later." }` | Provider configuration or query failure |

Internal provider error messages are never leaked; only the documented public
messages above are returned.

### `GET /api/activity` (deprecated alias)

The unversioned `GET /api/activity` route is retained as a deprecated alias of
`GET /api/v1/activity`. It accepts the same `period` parameter, returns the
same response shape, and applies the same validation and error contract. It is
implemented by re-exporting the versioned route handler, so behavior is
identical.

`/api/activity` will be removed in a future release. New consumers should use
`/api/v1/activity`.

### Planned endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/v1/timeseries` | Operations and active wallets over time |
| `GET /api/v1/dapps` | Top contracts by protocol |

---

## Entity registry

Known wallets and contracts are in [`data/entities.json`](data/entities.json):

```json
{
  "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2": {
    "name": "Soroswap",
    "category": "defi",
    "protocol": "Soroswap"
  }
}
```

Add rows to label more actors in the treemap.

```bash
npm run sync:directory
```

---

## Project structure

```text
app/
  page.tsx
  api/activity/route.ts            (deprecated alias → _handler.ts)
  api/activity/_handler.ts         (shared handler for both routes)
  api/v1/activity/route.ts         (versioned route → _handler.ts)
components/dashboard/
lib/hubble/
lib/entities/
data/entities.json
scripts/
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm test` | Deterministic unit tests (single run, no external credentials) |
| `npm run test:hubble` | BigQuery query smoke test |
| `npm run sync:directory` | Sync labels from Stellar Expert |
| `npm run typecheck` | TypeScript type-check (uses project tsconfig, no emitted files) |

---

## Data notes

Metric definitions, current-period coverage, Hubble freshness limits, source fields, and top-N qualifications are documented in the [versioned metric methodology](docs/metric-methodology.md). In particular, Hubble refreshes in intraday batches, current periods are provisional, and API responses are cached for 15 minutes by default.

## Activity categories

| Category | Operation types |
| --- | --- |
| Soroban | `invoke_host_function`, `extend_footprint_ttl`, `restore_footprint` |
| Payments | `payment`, `path_payment_strict_receive`, `path_payment_strict_send`, `create_account` |
| DEX | `manage_buy_offer`, `manage_sell_offer`, liquidity pool deposit and withdraw |
| Trustlines | `change_trust` |
| Account | `set_options`, `manage_data`, sponsorship operations |
| Other | Remaining types |

## Contributing

Contributions are welcome at [github.com/lumenmap/lumenmap](https://github.com/lumenmap/lumenmap).

1. Fork the repository and create a branch.
2. Make your changes. Run `npm run lint` before opening a pull request.
3. If you change Hubble queries, run `npm run test:hubble` with valid GCP credentials.
4. Open a pull request with a short description of what changed and why.

To add wallet or dApp labels, edit [`data/entities.json`](data/entities.json) or run `npm run sync:directory`.

## License

[MIT](LICENSE)
