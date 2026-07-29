# Hybrid Architecture Plan

Rollback of Phase 2 indexer migration for **live chain state**, while keeping the GraphQL indexer for **historical and bulk queries**.

## Background

The block explorer went through a Phase 2 migration that moved validators, reporters, and latest-block reads from RPC to the GraphQL indexer. Tellor-specific data (oracle, bridge, staking allowances) remained on RPC via `/api/*` routes.

**Problem:** Staking data is the **most stale data in the indexer** — validator `tokens` (voting power), bond status, and delegations lag or drift from chain state. This shows up on the dashboard, validator power pie chart, validators table, delegator counts, delegation pie charts, and proposals quorum calculations.

**Goal:** Use RPC for **all staking-related live state** (validators, delegations). Use the indexer for everything else (blocks, transactions, data feed, etc.). Load staking data through a shared cache with background/lazy fetching so the UI stays fast without holding unnecessary data in memory.

---

## Architecture Principles

1. **Indexer for historical / bulk data** — blocks, transactions, aggregate reports, bridge tables, proposal lists, account tx history.
2. **RPC for all staking + other live chain state** — validator stake/tokens, bond status, delegations, reporter list/count. **Never use the indexer for staking fields.**
3. **API routes as the RPC boundary** — browser calls `/api/*`; server uses `rpcManager` for endpoint failover. Do not call RPC REST URLs directly from components.
4. **No indexer fallback for live data** — if all RPC endpoints fail, show an error. `rpcManager` already rotates through fallback RPCs; stale indexer data is not an acceptable substitute.
5. **Fetch full validator/reporter lists, paginate client-side** — reporters and validators are each expected to stay under ~200 entries. One RPC request with a high `pagination.limit`; sort and page in the UI. **Delegations are different** — do not eagerly load all delegations for all validators; use tiered loading (see [Staking Data Loading Strategy](#staking-data-loading-strategy)).
6. **Shared staking cache with background refresh** — one in-memory cache serves dashboard, pie chart, validators page, and proposals. Dedupe in-flight requests. Stale-while-revalidate so navigations feel instant.
7. **Indexed block height is the canonical tip** — dashboard and blocks page both use the **highest indexed block** from GraphQL (`GET_SINGLE_LATEST_BLOCK`), not live RPC block height. Keeps block height consistent across the app.

---

## Final Data Source Matrix

| UI surface | Field / data | Source | Endpoint / query |
|------------|--------------|--------|------------------|
| Dashboard | Validator count | RPC | `GET /api/validators/live` |
| Dashboard | Total voting power | RPC | `GET /api/validators/live` (sum active `tokens`) |
| Dashboard | Reporter count | RPC | `GET /api/reporters/live` → `reporters.length` |
| Dashboard | Latest block height / time | **Indexer** | GraphQL `GET_SINGLE_LATEST_BLOCK` |
| Dashboard | Staking/unstaking allowances | RPC | existing `/api/staking-amount`, etc. |
| Dashboard | Current cycle, total supply | RPC | existing routes |
| Validator power pie chart (dashboard) | Voting power **across validators** | RPC | `GET /api/validators/live` |
| Delegation pie chart (validators page) | Delegator share **within one validator** | RPC | `GET /api/validator-delegations/[validatorAddress]/live` |
| Validators page | Stake, status, commission, metadata | RPC | `GET /api/validators/live` |
| Validators page | Delegator count per validator | RPC | `GET /api/validator-delegations/[validatorAddress]/live` → `delegations.length` |
| Reporters page | Full reporter list (incl. power) | RPC | `GET /api/reporters/live` |
| Proposals page | Quorum total staked | RPC | `GET /api/validators/live` |
| Proposals page | Quorum threshold % | **Indexer** | GraphQL `GET_GOV_QUORUM` (or RPC params later) |
| Proposals page | Proposal list | **Indexer** | GraphQL `GET_GOV_PROPOSALS` |
| Blocks page | Block list (all pages) | **Indexer** | GraphQL `GET_LATEST_BLOCKS` |
| Blocks detail | Block header, txs | **Indexer** | GraphQL |
| Blocks detail | Block results / vote extensions | RPC | `getBlockResults()` (unchanged) |
| Blocks proposer moniker enrichment (`GET_VALIDATORS` on blocks pages) | Validator **moniker only** (not stake) | **Indexer** (or optional read from shared validators cache if already warm) | GraphQL or cached RPC metadata |

**Staking rule:** Any field derived from `tokens`, `shares`, `bond_status`, or delegation balances must come from RPC. Indexer validator/delegation queries must not be used anywhere after migration.

---

## New API Routes

### `GET /api/validators/live`

Fetches all validators in a single request.

**Upstream RPC (preferred):**
```
GET {baseEndpoint}/cosmos/staking/v1beta1/validators?pagination.limit=500
```

**Alternative:** ABCI `queryAllValidators()` in `src/rpc/abci/index.ts` (already implements high-limit `PageRequest`).

**Server behavior:**
- Resolve network from the `ACTIVE_NETWORK` cookie (default `mainnet`), then loop that network's RPC endpoints until one succeeds (same pattern as `/api/status`, `/api/reporter-power`).
- Report success/failure to `rpcManager`.
- Return `500` if all endpoints fail.

**Response shape:**
```json
{
  "validators": [
    {
      "operatorAddress": "layervaloper1...",
      "consensusPubkey": { ... },
      "bondStatus": "BOND_STATUS_BONDED",
      "tokens": "1234567890",
      "jailed": false,
      "commission": {
        "commissionRates": { "rate": "0.10", ... }
      },
      "description": {
        "moniker": "...",
        "identity": "...",
        "website": "...",
        "securityContact": "...",
        "details": "..."
      }
    }
  ],
  "count": 42
}
```

**Notes:**
- Normalize REST snake_case (`operator_address`, `bond_status`) to the camelCase shape above so UI code matches existing GraphQL field names.
- Map `bond_status` enum strings to the numeric status values the validators table already uses (`BOND_STATUS_BONDED` → `3`, etc.) in the transformer, or centralize in `src/datasources/live/validators.ts`.
- `count` = `validators.length`.

**Replaces:** Deprecated `GET /api/validators` (currently returns 410). Restore this route with RPC implementation instead of GraphQL.

---

### `GET /api/reporters/live`

Fetches all reporters in a single request.

**Upstream RPC:**
```
GET {baseEndpoint}/tellor-io/layer/reporter/reporters?pagination.limit=500
```

**Server behavior:** Same failover pattern as validators route.

**Response shape:**
```json
{
  "reporters": [
    {
      "address": "layer1...",
      "power": "1234567",
      "metadata": {
        "moniker": "...",
        "jailed": false,
        "min_tokens_required": "...",
        "commission_rate": "...",
        "last_updated": "...",
        "jailed_until": "..."
      }
    }
  ],
  "count": 87
}
```

**Notes:**
- Map RPC fields to the `ReporterData` shape used by `src/pages/reporters/index.tsx`.
- `power` is included in the list response — no separate power fetch needed.
- Selector count: confirm RPC response includes selector count per reporter. If not, keep `/api/reporter-selectors/[reporter]` for that column only (already exists).

**Replaces:** Deprecated `GET /api/reporters` (currently returns 410). Restore with RPC implementation.

---

### `GET /api/validator-delegations/[validatorAddress]/live`

Fetches all delegations for a single validator in one request.

**Upstream RPC:**
```
GET {baseEndpoint}/cosmos/staking/v1beta1/validators/{validatorAddress}/delegations?pagination.limit=500
```

**Server behavior:** Same failover pattern as other live routes.

**Response shape:**
```json
{
  "delegations": [
    {
      "delegatorAddress": "layer1...",
      "validatorAddress": "layervaloper1...",
      "shares": "1234567.89",
      "balance": { "denom": "loya", "amount": "1234567" }
    }
  ],
  "count": 15
}
```

**Notes:**
- Fetch full list with high `pagination.limit` when the pie chart needs share breakdown.
- `count` = `delegations.length` — used for the validators table "delegator count" column.
- **Do not eagerly fetch delegations for every validator on page load.** Use the [tiered loading strategy](#staking-data-loading-strategy) below.

**Optional count-only optimization:** If the RPC response exposes `pagination.total`, the delegator-count column can use `?pagination.limit=1` and read `total` without loading the full delegation array into memory. Full list fetch only when the `DelegationPieChart` tooltip opens (or reuse cache if already loaded).

**Replaces:** Deprecated `GET /api/validator-delegations/[validatorAddress]` (currently returns 410). Restore with RPC implementation instead of GraphQL.

---

## Staking Data Loading Strategy

Staking RPC data should feel instant across pages without firing ~100 delegation requests on every validators page load or duplicating validator fetches across dashboard + pie chart + proposals.

### Design: shared cache + tiered loading

No new dependencies required (project does not use React Query/SWR today). Implement a lightweight module-level cache in `src/datasources/live/stakingCache.ts`.

```
┌─────────────────────────────────────────────────────────────┐
│  stakingCache (module singleton)                              │
│                                                             │
│  validators: { data, fetchedAt, error, inflightPromise }    │
│  delegations: Map<validatorAddr, { data, count, fetchedAt }>│
│                                                             │
│  • dedupe in-flight requests                                │
│  • TTL + stale-while-revalidate                             │
│  • bounded delegation cache (LRU evict)                     │
└─────────────────────────────────────────────────────────────┘
         ▲              ▲              ▲
         │              │              │
   Dashboard      Validators page   Proposals quorum
   Pie chart
```

### Tier 0 — Validators list (always RPC, shared)

| Property | Value |
|----------|-------|
| **Fetch** | One call to `/api/validators/live` (~100 validators, small payload) |
| **Cache TTL** | 30s fresh; serve stale up to 5 min while revalidating in background |
| **Deduping** | If dashboard poll + pie chart mount + validators page load overlap, share one in-flight request |
| **Memory** | ~100 validator objects in memory — negligible |
| **Consumers** | Dashboard stats, `ValidatorPowerPieChart`, validators table (stake/status/commission), proposals quorum |

**Hook:** `useLiveValidators()` — returns `{ validators, isLoading, isStale, error, refresh }`.

Dashboard polling calls `refresh()` on interval; other pages read from cache if fresh.

### Tier 1 — Delegator count (background, per visible validator)

| Property | Value |
|----------|-------|
| **When** | After validators table renders with Tier 0 data |
| **What** | Fetch count per validator for **visible rows first**, then remaining rows in background |
| **How** | Prefer `pagination.limit=1` + `pagination.total` if RPC supports it; otherwise fetch full list and store only `count` until pie chart needs shares |
| **Concurrency** | Max 3–5 parallel delegation requests (avoid RPC burst) |
| **UI** | Show `—` or skeleton in delegator count cell until loaded; no blocking spinner on whole table |
| **Sort by delegator count** | Disable sort until counts loaded for full set, OR sort only loaded rows and show "loading counts…" — prefer waiting for background batch to finish before enabling sort (validators page already blocks some sorts today) |

### Tier 2 — Full delegation list (on demand only)

| Property | Value |
|----------|-------|
| **When** | User opens `DelegationPieChart` tooltip for a validator |
| **Fetch** | `/api/validator-delegations/[addr]/live` with full `pagination.limit` |
| **Cache** | Store in `delegations` map; if Tier 1 already loaded full list, reuse it |
| **Memory cap** | LRU evict after ~20 full delegation lists (typical delegations per validator are small; ~20 × ~50 delegators is fine). Count-only entries are tiny and can stay longer. |
| **Chart logic** | Unchanged — top-5 + "Others" computed client-side from cached full list |

### What NOT to do

- **Do not** `Promise.all(validators.map(fetchDelegations))` on mount — ~100 RPC calls, slow, memory-heavy.
- **Do not** duplicate validator fetches per component — use `stakingCache`.
- **Do not** fall back to indexer staking queries on RPC failure.
- **Do not** keep full delegation arrays for all validators in memory indefinitely.

### Polling / refresh behavior

| Surface | Validators refresh | Delegations refresh |
|---------|-------------------|---------------------|
| Dashboard | Every 5s via `stakingCache.refreshValidators()` | N/A |
| Validator pie chart | Read cache; inherit dashboard poll when on same page | N/A |
| Validators page | On mount + manual refresh button; background revalidate every 60s | Background Tier 1 on load; invalidate single validator on manual refresh |
| Delegation pie chart | N/A | On tooltip open; cache 60s TTL |
| Proposals quorum | Read `stakingCache` on quorum calc | N/A |

### File layout

```
src/datasources/live/
  stakingCache.ts    # singleton cache, dedupe, TTL, LRU eviction
  useLiveValidators.ts
  useValidatorDelegations.ts   # lazy fetch + cache for one validator
  validators.ts      # API fetch + normalize
  delegations.ts     # API fetch + normalize
  reporters.ts
  types.ts
```

### Future optimization (out of scope for v1)

- Add `@tanstack/react-query` if cache logic grows unwieldy — not required for initial implementation.
- Server-side short TTL cache on `/api/validators/live` (e.g. 5s) to reduce duplicate RPC hits across concurrent users.
- Batch delegations endpoint if the chain module adds one.

---

## Two Pie Charts (Do Not Confuse)

| Component | Location | What it shows | Data source |
|-----------|----------|---------------|-------------|
| `ValidatorPowerPieChart` | Dashboard | How total network voting power is split **between validators** | `/api/validators/live` (validator `tokens`) |
| `DelegationPieChart` | Validators table (delegator count column tooltip) | How one validator's stake is split **between its delegators** | `/api/validator-delegations/[addr]/live` (delegation `shares`) |

The dashboard validator pie chart has **nothing to do with delegations**. Delegations only power the per-validator delegator breakdown on the validators page.

---

## New Client Data Layer

Add fetch + transform helpers and the **staking cache** (see above):

```
src/datasources/live/
  stakingCache.ts       # shared cache, in-flight dedupe, TTL, delegation LRU
  useLiveValidators.ts  # hook for all validator consumers
  useValidatorDelegations.ts  # lazy per-validator hook (count + full list)
  validators.ts         # fetchLiveValidators(), mapValidatorToTableRow()
  reporters.ts          # fetchLiveReporters(), mapReporterToTableRow()
  delegations.ts        # fetchValidatorDelegations(addr), mapDelegationToChartRow()
  types.ts              # LiveValidator, LiveReporter, LiveDelegation, etc.
```

Reuse existing utils: `isActiveValidator()`, `convertVotingPower()`, `convertRateToPercent()`.

---

## Component Changes

### `src/pages/index.tsx` (Dashboard)

| Change | Detail |
|--------|--------|
| Remove | `GET_DASHBOARD_VALIDATORS` polling |
| Remove | `GET_DASHBOARD_REPORTERS` polling |
| Add | `useLiveValidators()` — shared cache, 5s poll via `refresh()` |
| Add | Poll `fetchLiveReporters()` every 5s for `count` |
| Keep | `GET_SINGLE_LATEST_BLOCK` every 3s for block height/time |
| Keep | All existing Tellor RPC routes (cycle, allowances, supply) |
| Error UX | Show error state on stat cards when live fetch fails; do not silently display `0` |

### `src/components/ValidatorPowerPieChart/index.tsx`

| Change | Detail |
|--------|--------|
| Remove | `GET_DASHBOARD_VALIDATORS` |
| Add | `useLiveValidators()` — reads shared cache; no independent fetch |
| Filter | Active validators via `isActiveValidator(bondStatus)` |

### `src/pages/validators/index.tsx`

| Change | Detail |
|--------|--------|
| Remove | `GET_VALIDATORS` GraphQL fetch |
| Remove | `GET_DELEGATIONS_BY_VALIDATOR` / `fetchDelegatorCount()` GraphQL |
| Add | `useLiveValidators()` on mount — table renders immediately with stake/status |
| Add | Background Tier 1 delegator counts for visible rows, then rest (staggered, max 3–5 concurrent) |
| Simplify | Client-side sort + pagination on full validator list from cache |
| Remove | Unused `selectTmClient` / `selectRPCAddress` imports if no longer referenced |

**Suggested state shape:**
- Validators from `useLiveValidators()` — full RPC list in shared cache
- `delegatorCounts: Map<addr, number | 'loading'>` — local to page, filled by background Tier 1
- `displayValidators` — `useMemo` slice after sort + page index
- `totalVotingPower` — computed from cached validator list

**Sort by delegator count:** Enable only after background count batch completes (or show partial state with indicator).

### `src/components/DelegationPieChart/index.tsx`

| Change | Detail |
|--------|--------|
| Remove | `GET_DELEGATIONS_BY_VALIDATOR` GraphQL |
| Add | `useValidatorDelegations(validatorAddress)` — fetches Tier 2 on mount (tooltip open); reads cache if Tier 1 already populated |
| Keep | Existing client-side top-5 + "Others" chart logic |

### `src/pages/reporters/index.tsx`

| Change | Detail |
|--------|--------|
| Remove | All `GET_REPORTERS` GraphQL queries |
| Remove | `fetchReporterPower()` and `/api/reporter-power` dependency |
| Remove | GraphQL cursor state (`pagesCursors`, `pageInfo`, `after` cursors) |
| Add | `fetchLiveReporters()` on mount; store full list in `allData` |
| Simplify | Client-side sort (all columns, including power) + client-side pagination |
| Update | Page header comment to reflect RPC-first architecture |

### `src/pages/proposals/index.tsx`

| Change | Detail |
|--------|--------|
| Remove | `GET_DASHBOARD_VALIDATORS` from `fetchQuorumRequirement` |
| Add | Read total active stake from `stakingCache.getValidators()` (no extra network call if cache warm) |
| Keep | `GET_GOV_QUORUM` for quorum threshold % |

### `src/components/Navbar/index.tsx`

| Change | Detail |
|--------|--------|
| Keep | GraphQL `GET_SINGLE_LATEST_BLOCK` for block height in network modal |
| Verify | Block height display uses indexer value, not `tmClient.status().syncInfo.latestBlockHeight` (RPC tip can differ from indexed tip) |

### `src/rpc/query/index.ts`

| Change | Detail |
|--------|--------|
| Update | `getValidators()` — currently calls deprecated `/api/validators` (410). Point to `/api/validators/live` or remove if unused after migration. |
| Update | `getReporters()` — currently calls deprecated `/api/reporters` (410). Point to `/api/reporters/live` or remove. |

---

## Files to Deprecate / Remove After Migration

| File | Action |
|------|--------|
| `src/pages/api/validators.ts` | Replace 410 stub with live RPC implementation (or create `validators/live.ts` and redirect) |
| `src/pages/api/reporters.ts` | Replace 410 stub with live RPC implementation (or create `reporters/live.ts`) |
| `src/pages/api/reporter-power.ts` | Remove once reporters page uses `/api/reporters/live` (power in list response) |
| `src/pages/api/validator-delegations/[validatorAddress].ts` | Replace 410 stub with live RPC implementation |
| GraphQL queries (keep in file, stop using in live surfaces) | `GET_DASHBOARD_VALIDATORS`, `GET_DASHBOARD_REPORTERS`, `GET_REPORTER_COUNT`, `GET_DELEGATIONS_BY_VALIDATOR` |

Do **not** delete GraphQL queries still used by indexer-only pages (e.g. `GET_VALIDATORS` for blocks proposer moniker enrichment).

---

## Error Handling

**Server (`/api/*/live`):**
```typescript
// Resolve network from ACTIVE_NETWORK cookie (default mainnet)
// Try each endpoint via fetchWithRpcFailover / getRpcEndpointsFromRequest
// On success: rpcManager.reportSuccess(endpoint); return 200
// On all failures: return 500 { error, details }
```

**Client:**
- Dashboard stat cards: skeleton → data or error badge (not `0` on failure)
- Validators / reporters tables: full-page or inline error with retry button
- Pie chart: error message in chart container
- No fallback to GraphQL for live fields

---

## What Stays on the Indexer (No Changes)

- `src/pages/blocks/index.tsx` — block list, page-1 polling
- `src/pages/blocks/[height].tsx` — block detail, txs (plus existing RPC `getBlockResults`)
- `src/pages/transactions/index.tsx`, `src/pages/txs/[hash].tsx`
- `src/pages/accounts/[address].tsx` — tx history (balances stay RPC)
- `src/pages/data-feed/index.tsx` — aggregate reports
- `src/pages/bridge-deposits/index.tsx`, `src/pages/bridge-withdrawals/index.tsx`
- `src/pages/oracle-bridge/index.tsx` — GraphQL for reports, RPC for bridge tooling
- `src/pages/proposals/index.tsx` — proposal list (only quorum stake calc changes)
- Blocks proposer moniker enrichment — **not staking**; can stay on indexer. Optionally read moniker from warm `stakingCache` to avoid a second validator source (metadata only, never `tokens` from indexer).

---

## Implementation Phases

### Phase 1 — API routes + staking cache
- [ ] Implement `GET /api/validators/live` with RPC failover and response normalization
- [ ] Implement `GET /api/reporters/live` with RPC failover and response normalization
- [ ] Implement `GET /api/validator-delegations/[validatorAddress]/live` with RPC failover and response normalization
- [ ] Add `src/datasources/live/stakingCache.ts` (dedupe, TTL, stale-while-revalidate, delegation LRU)
- [ ] Add `useLiveValidators()` and `useValidatorDelegations()` hooks
- [ ] Verify `pagination.total` works for count-only delegation requests
- [ ] Manually verify RPC staking values vs indexer (confirm indexer drift in dev)

### Phase 2 — Dashboard + shared components
- [ ] Update `src/pages/index.tsx` to `useLiveValidators()` + reporters live fetch
- [ ] Update `src/components/ValidatorPowerPieChart/index.tsx` to `useLiveValidators()`
- [ ] Update `src/pages/proposals/index.tsx` quorum to read from `stakingCache`
- [ ] Add error states to dashboard stat cards

### Phase 3 — List pages
- [ ] Refactor `src/pages/validators/index.tsx` — immediate stake render + background delegator counts
- [ ] Refactor `src/components/DelegationPieChart/index.tsx` to `useValidatorDelegations()`
- [ ] Refactor `src/pages/reporters/index.tsx` to full-list RPC + client pagination/sort
- [ ] Remove `/api/reporter-power` usage

### Phase 4 — Cleanup
- [ ] Fix `getValidators()` / `getReporters()` in `src/rpc/query/index.ts`
- [ ] Update `data-source-matrix.md` to reflect final architecture
- [ ] Update misleading `HYBRID DATA ARCHITECTURE` header comments on affected pages
- [ ] Remove dead GraphQL imports from migrated components

---

## Testing Checklist

### Validators (RPC vs previous GraphQL)
- [ ] Dashboard validator count matches active bonded validators from RPC
- [ ] Dashboard total voting power matches sum of active validator `tokens` / 1e6
- [ ] Validator power pie chart (dashboard) slices match validators page voting power %
- [ ] Delegation pie chart (validators page) delegator shares match RPC delegation list
- [ ] Delegator count column matches `delegations.length` from RPC per validator
- [ ] Proposals quorum "total staked" matches dashboard total voting power
- [ ] Validators table sort by voting power shows correct order
- [ ] Validators table pagination shows correct rows after sort

### Reporters
- [ ] Dashboard reporter count matches `reporters.length` from RPC
- [ ] Reporters table power column matches RPC `power` field
- [ ] Sort by power shows correct order across all pages
- [ ] Pagination slices correct rows after sort

### Blocks (unchanged, regression)
- [ ] Dashboard block height matches blocks page top row height (both indexer)
- [ ] Dashboard block height does not jump ahead of blocks page (would indicate RPC tip leaking in)

### Staking cache / performance
- [ ] Navigating dashboard → validators page does not trigger duplicate validator RPC if cache is fresh
- [ ] Validators table shows stake immediately; delegator counts populate progressively
- [ ] Opening delegation pie chart does not refetch if delegations already cached
- [ ] Delegation LRU evicts old full lists; memory stable when browsing many validators
- [ ] No GraphQL staking queries fire after migration (`GET_DASHBOARD_VALIDATORS`, `GET_DELEGATIONS_BY_VALIDATOR`, etc.)

### Error / failover
- [ ] Primary RPC down → fallback RPC serves data
- [ ] All RPCs down → error shown, no stale GraphQL values displayed as live

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Validators page stake source | Live RPC | Accurate voting power |
| Blocks page source | Indexer only | Historical consistency |
| Dashboard block height | Highest **indexed** block | Consistent with blocks page |
| RPC access pattern | API routes | Matches existing Tellor routes, avoids CORS |
| RPC failure behavior | Error, no indexer fallback | Avoid displaying incorrect live data |
| Reporter count source | Live RPC | User requirement |
| Validators + reporters pagination | Fetch all (~500 limit), client-side sort/page | <200 entries expected; power/stake sort needs full set |
| Reporter power enrichment | Included in list RPC response | Eliminates `/api/reporter-power` second fetch |
| Delegator counts + delegation pie chart | Live RPC, tiered loading | Accurate; avoid N+1 burst on mount |
| Staking data loading | Shared `stakingCache` + background delegation fetch | Fast UI, low memory, no duplicate RPC |
| Indexer for staking | **Never** | Staking is the stalest indexer data |

---

## Reference: Existing Code to Reuse

| Asset | Location | Use |
|-------|----------|-----|
| RPC failover | `src/utils/rpcManager.ts` | All new live API routes |
| Validator ABCI query | `src/rpc/abci/index.ts` → `queryAllValidators()` | Alternative to REST for validators route |
| Reporter RPC URL | `src/pages/api/reporter-power.ts` | URL pattern for reporters route |
| Status route pattern | `src/pages/api/status.ts` | Failover + endpoint selection template |
| Active validator filter | `src/utils/helper.ts` → `isActiveValidator()` | Dashboard, pie chart, quorum |
| Deprecated RPC stubs | `src/pages/api/validators.ts`, `reporters.ts` | Comments document prior approach |
| Indexer block query | `GET_SINGLE_LATEST_BLOCK` in `src/datasources/graphql/queries.ts` | Dashboard + navbar block height |

---

## Out of Scope (Future)

- Re-enabling `subscribeNewBlock` / Redux `streamSlice` for global block streaming
- `@tanstack/react-query` adoption (only if hand-rolled cache becomes unwieldy)
- Server-side TTL cache on live API routes (multi-user RPC deduplication)
- Moving governance params to RPC
- Moving blocks proposer moniker lookup to RPC (or unify via warm cache metadata read)
- Server-side pagination if validator/reporter sets grow beyond ~500
- Batch delegations endpoint (if chain adds one)
