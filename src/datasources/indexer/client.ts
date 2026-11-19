// Fetches blocks and transactions through the explorer's own API routes, which decode the indexer's compressed JSON before it reaches the browser.
import type {
  BlockResponse,
  TransactionResponse,
  TransactionsResponse,
} from '@/datasources/graphql/types'
import { rpcManager } from '@/utils/rpcManager'

type QueryParams = Record<string, string | number | undefined | null>

async function getJson<T>(path: string, params: QueryParams = {}): Promise<T> {
  const search = new URLSearchParams()
  search.set('network', rpcManager.getActiveNetwork())
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const response = await fetch(`${path}?${search.toString()}`, {
    cache: 'no-store',
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(
      body?.details ||
        body?.error ||
        `HTTP ${response.status}: ${response.statusText}`
    )
  }
  return body as T
}

export const fetchTransactionByHash = (hash: string) =>
  getJson<TransactionResponse>(
    `/api/indexer/transaction/${encodeURIComponent(hash)}`
  )

export const fetchLatestTransactions = (first: number) =>
  getJson<TransactionsResponse>('/api/indexer/transactions', { first })

export const fetchBlockByHeight = (height: string) =>
  getJson<BlockResponse>(`/api/indexer/block/${encodeURIComponent(height)}`)

export const fetchBlockTransactions = (height: string, first: number) =>
  getJson<TransactionsResponse>(
    `/api/indexer/block/${encodeURIComponent(height)}/transactions`,
    { first }
  )

export const fetchAccountTransactions = (
  address: string,
  first: number,
  after?: string | null
) =>
  getJson<TransactionsResponse>(
    `/api/indexer/account/${encodeURIComponent(address)}/transactions`,
    { first, after }
  )
