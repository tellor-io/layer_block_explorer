// Reads blocks and transactions from the GraphQL indexer and returns them decoded, in the shapes the pages render.
import { graphqlQuery } from '@/datasources/graphql/client'
import {
  GET_ACCOUNT_TRANSACTIONS,
  GET_BLOCK_BY_HEIGHT,
  GET_TRANSACTION_BY_HASH,
  GET_TRANSACTIONS,
  GET_TRANSACTIONS_BY_BLOCK_HEIGHT,
  GET_TRANSACTIONS_BY_IDS,
} from '@/datasources/graphql/queries'
import type {
  AccountTransactionsResponse,
  Block,
  BlockNodeResponse,
  Connection,
  Edge,
  Transaction,
  TransactionNode,
  TransactionNodeResponse,
  TransactionNodesResponse,
} from '@/datasources/graphql/types'
import type { LayerNetwork } from '@/utils/constant'
import { toBlock, toTransaction } from './decode'

// Runs one GraphQL query against the indexer of the given network; tests pass their own
export type QueryRunner = <T>(
  query: string,
  variables: Record<string, unknown>,
  network: LayerNetwork
) => Promise<T>

export const indexerQuery: QueryRunner = (query, variables, network) =>
  graphqlQuery(query, variables, 3, 15000, network)

// Each blob column has had two names: the compressed bytes served now and the text an earlier indexer served
const BLOB_FIELDS = [
  { compressed: 'txDataCompressed', plain: 'txData' },
  { compressed: 'voteExtensionsCompressed', plain: 'voteExtensions' },
]

type BlobForm = 'compressed' | 'plain'

// Which column names each network's indexer accepted last time, so a mismatch costs one retry per process
const blobFormByNetwork = new Map<LayerNetwork, BlobForm>()

function withBlobForm(query: string, form: BlobForm): string {
  if (form === 'compressed') return query
  return BLOB_FIELDS.reduce(
    (text, field) => text.split(field.compressed).join(field.plain),
    query
  )
}

// True when the indexer rejected a blob column name of this form, meaning it serves the other one
function rejectsBlobForm(error: unknown, form: BlobForm): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return BLOB_FIELDS.some((field) =>
    message.includes(`Cannot query field "${field[form]}"`)
  )
}

async function runBlobQuery<T>(
  query: string,
  variables: Record<string, unknown>,
  network: LayerNetwork,
  run: QueryRunner
): Promise<T> {
  const form = blobFormByNetwork.get(network) || 'compressed'
  try {
    return await run<T>(withBlobForm(query, form), variables, network)
  } catch (error) {
    if (!rejectsBlobForm(error, form)) throw error
    const other: BlobForm = form === 'compressed' ? 'plain' : 'compressed'
    const result = await run<T>(withBlobForm(query, other), variables, network)
    blobFormByNetwork.set(network, other)
    return result
  }
}

function decodeEdges(
  connection: Connection<TransactionNode>
): Connection<Transaction> {
  return {
    edges: connection.edges.map((edge) => ({
      cursor: edge.cursor,
      node: toTransaction(edge.node),
    })),
    pageInfo: connection.pageInfo,
  }
}

export async function fetchTransaction(
  hash: string,
  network: LayerNetwork,
  run: QueryRunner = indexerQuery
): Promise<Transaction | null> {
  const response = await runBlobQuery<TransactionNodeResponse>(
    GET_TRANSACTION_BY_HASH,
    { id: hash },
    network,
    run
  )
  return response.transaction ? toTransaction(response.transaction) : null
}

export async function fetchLatestTransactions(
  first: number,
  network: LayerNetwork,
  run: QueryRunner = indexerQuery
): Promise<Connection<Transaction>> {
  const response = await runBlobQuery<TransactionNodesResponse>(
    GET_TRANSACTIONS,
    { first },
    network,
    run
  )
  return decodeEdges(response.transactions)
}

export async function fetchBlock(
  height: string,
  network: LayerNetwork,
  run: QueryRunner = indexerQuery
): Promise<Block | null> {
  const response = await runBlobQuery<BlockNodeResponse>(
    GET_BLOCK_BY_HEIGHT,
    { blockHeight: height },
    network,
    run
  )
  return response.block ? toBlock(response.block) : null
}

export async function fetchBlockTransactions(
  height: string,
  first: number,
  network: LayerNetwork,
  run: QueryRunner = indexerQuery
): Promise<Connection<Transaction>> {
  const response = await runBlobQuery<TransactionNodesResponse>(
    GET_TRANSACTIONS_BY_BLOCK_HEIGHT,
    { blockHeight: height, first },
    network,
    run
  )
  return decodeEdges(response.transactions)
}

// An account index id is "<address>-<transaction hash>"
export function transactionHashFromAccountTransactionId(id: string): string {
  const separator = id.indexOf('-')
  return separator < 0 ? id : id.slice(separator + 1)
}

// One page of an address's history, newest first: the account index gives the hashes and the cursor, then the transactions are fetched by id
export async function fetchAccountTransactions(
  address: string,
  first: number,
  after: string | undefined,
  network: LayerNetwork,
  run: QueryRunner = indexerQuery
): Promise<Connection<Transaction>> {
  const variables: Record<string, unknown> = { address, first }
  if (after) variables.after = after
  const index = await run<AccountTransactionsResponse>(
    GET_ACCOUNT_TRANSACTIONS,
    variables,
    network
  )
  const entries = index.accountTransactions.edges
  const hashes = entries.map((entry) =>
    transactionHashFromAccountTransactionId(entry.node.id)
  )
  const byHash = new Map<string, Transaction>()
  if (hashes.length > 0) {
    const details = await runBlobQuery<TransactionNodesResponse>(
      GET_TRANSACTIONS_BY_IDS,
      { ids: hashes, first: hashes.length },
      network,
      run
    )
    for (const edge of details.transactions.edges) {
      byHash.set(edge.node.id.toUpperCase(), toTransaction(edge.node))
    }
  }
  const edges: Edge<Transaction>[] = []
  for (const entry of entries) {
    const transaction = byHash.get(
      transactionHashFromAccountTransactionId(entry.node.id).toUpperCase()
    )
    if (transaction) edges.push({ cursor: entry.cursor, node: transaction })
  }
  return { edges, pageInfo: index.accountTransactions.pageInfo }
}
