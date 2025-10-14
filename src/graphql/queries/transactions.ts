import { gql } from '@apollo/client'
import { TRANSACTION_FIELDS } from './fragments'

// ============================================================================
// TRANSACTION QUERIES
// ============================================================================

/**
 * Get a specific transaction by hash
 */
export const GET_TRANSACTION_BY_HASH = gql`
  ${TRANSACTION_FIELDS}
  query GetTransactionByHash($hash: String!) {
    transaction(id: $hash) {
      ...TransactionFields
    }
  }
`

/**
 * Get transactions with pagination
 */
export const GET_TRANSACTIONS = gql`
  ${TRANSACTION_FIELDS}
  query GetTransactions($limit: Int!, $offset: Int!) {
    transactions(
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...TransactionFields
    }
  }
`

/**
 * Get transactions by block height
 */
export const GET_TRANSACTIONS_BY_BLOCK = gql`
  ${TRANSACTION_FIELDS}
  query GetTransactionsByBlock($blockHeight: BigInt!, $limit: Int!, $offset: Int!) {
    transactions(
      where: { blockHeight_eq: $blockHeight }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...TransactionFields
    }
  }
`

/**
 * Get transactions within a time range
 */
export const GET_TRANSACTIONS_BY_TIME_RANGE = gql`
  ${TRANSACTION_FIELDS}
  query GetTransactionsByTimeRange($startTime: DateTime!, $endTime: DateTime!, $limit: Int!, $offset: Int!) {
    transactions(
      where: {
        timestamp_gte: $startTime
        timestamp_lte: $endTime
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...TransactionFields
    }
  }
`

/**
 * Get transaction count for statistics
 */
export const GET_TRANSACTION_COUNT = gql`
  query GetTransactionCount {
    transactionsConnection {
      totalCount
    }
  }
`

/**
 * Get transaction statistics
 */
export const GET_TRANSACTION_STATS = gql`
  query GetTransactionStats {
    transactionsConnection {
      totalCount
    }
    transactions(orderBy: timestamp, orderDirection: desc, first: 1) {
      timestamp
    }
    transactions(orderBy: timestamp, orderDirection: asc, first: 1) {
      timestamp
    }
  }
`

/**
 * Get transactions by address (sender or recipient)
 * Note: This would require additional fields in the schema or a separate query
 */
export const GET_TRANSACTIONS_BY_ADDRESS = gql`
  ${TRANSACTION_FIELDS}
  query GetTransactionsByAddress($address: String!, $limit: Int!, $offset: Int!) {
    transactions(
      where: { 
        or: [
          { txData_containsInsensitive: $address }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...TransactionFields
    }
  }
`

/**
 * Search transactions by hash or data content
 */
export const SEARCH_TRANSACTIONS = gql`
  ${TRANSACTION_FIELDS}
  query SearchTransactions($searchTerm: String!, $limit: Int!, $offset: Int!) {
    transactions(
      where: {
        or: [
          { id_containsInsensitive: $searchTerm }
          { txData_containsInsensitive: $searchTerm }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...TransactionFields
    }
  }
`

/**
 * Get recent transactions (last 24 hours)
 */
export const GET_RECENT_TRANSACTIONS = gql`
  ${TRANSACTION_FIELDS}
  query GetRecentTransactions($limit: Int!) {
    transactions(
      first: $limit
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...TransactionFields
    }
  }
`

/**
 * Get transaction count by block
 */
export const GET_TRANSACTION_COUNT_BY_BLOCK = gql`
  query GetTransactionCountByBlock($blockHeight: BigInt!) {
    transactionsConnection(where: { blockHeight_eq: $blockHeight }) {
      totalCount
    }
  }
`

/**
 * Get transactions with specific data pattern
 */
export const GET_TRANSACTIONS_BY_DATA_PATTERN = gql`
  ${TRANSACTION_FIELDS}
  query GetTransactionsByDataPattern($pattern: String!, $limit: Int!, $offset: Int!) {
    transactions(
      where: { txData_containsInsensitive: $pattern }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...TransactionFields
    }
  }
`
