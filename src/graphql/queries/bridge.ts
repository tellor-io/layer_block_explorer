import { gql } from '@apollo/client'
import { BRIDGE_DEPOSIT_FIELDS, WITHDRAW_FIELDS } from './fragments'

// ============================================================================
// BRIDGE QUERIES
// ============================================================================

/**
 * Get all bridge deposits
 */
export const GET_BRIDGE_DEPOSITS = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  query GetBridgeDeposits {
    bridgeDeposits {
      ...BridgeDepositFields
    }
  }
`

/**
 * Get bridge deposits with pagination
 */
export const GET_BRIDGE_DEPOSITS_PAGINATED = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  query GetBridgeDepositsPaginated($limit: Int!, $offset: Int!) {
    bridgeDeposits(
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...BridgeDepositFields
    }
  }
`

/**
 * Get a specific bridge deposit by ID
 */
export const GET_BRIDGE_DEPOSIT_BY_ID = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  query GetBridgeDepositById($depositId: Int!) {
    bridgeDeposits(where: { depositId_eq: $depositId }, first: 1) {
      ...BridgeDepositFields
    }
  }
`

/**
 * Get bridge deposits by sender address
 */
export const GET_BRIDGE_DEPOSITS_BY_SENDER = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  query GetBridgeDepositsBySender($sender: String!, $limit: Int!, $offset: Int!) {
    bridgeDeposits(
      where: { sender_eq: $sender }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...BridgeDepositFields
    }
  }
`

/**
 * Get bridge deposits by recipient address
 */
export const GET_BRIDGE_DEPOSITS_BY_RECIPIENT = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  query GetBridgeDepositsByRecipient($recipient: String!, $limit: Int!, $offset: Int!) {
    bridgeDeposits(
      where: { recipient_eq: $recipient }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...BridgeDepositFields
    }
  }
`

/**
 * Get reported bridge deposits
 */
export const GET_REPORTED_BRIDGE_DEPOSITS = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  query GetReportedBridgeDeposits($limit: Int!, $offset: Int!) {
    bridgeDeposits(
      where: { reported_eq: true }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...BridgeDepositFields
    }
  }
`

/**
 * Get unclaimed bridge deposits
 */
export const GET_UNCLAIMED_BRIDGE_DEPOSITS = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  query GetUnclaimedBridgeDeposits($limit: Int!, $offset: Int!) {
    bridgeDeposits(
      where: { claimed_eq: false }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...BridgeDepositFields
    }
  }
`

/**
 * Get claimed bridge deposits
 */
export const GET_CLAIMED_BRIDGE_DEPOSITS = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  query GetClaimedBridgeDeposits($limit: Int!, $offset: Int!) {
    bridgeDeposits(
      where: { claimed_eq: true }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...BridgeDepositFields
    }
  }
`

/**
 * Get bridge deposits by amount range
 */
export const GET_BRIDGE_DEPOSITS_BY_AMOUNT_RANGE = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  query GetBridgeDepositsByAmountRange($minAmount: BigInt!, $maxAmount: BigInt!, $limit: Int!, $offset: Int!) {
    bridgeDeposits(
      where: {
        and: [
          { amount_gte: $minAmount }
          { amount_lte: $maxAmount }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...BridgeDepositFields
    }
  }
`

/**
 * Get bridge deposits by tip range
 */
export const GET_BRIDGE_DEPOSITS_BY_TIP_RANGE = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  query GetBridgeDepositsByTipRange($minTip: BigInt!, $maxTip: BigInt!, $limit: Int!, $offset: Int!) {
    bridgeDeposits(
      where: {
        and: [
          { tip_gte: $minTip }
          { tip_lte: $maxTip }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...BridgeDepositFields
    }
  }
`

/**
 * Get bridge deposits by block height range
 */
export const GET_BRIDGE_DEPOSITS_BY_BLOCK_RANGE = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  query GetBridgeDepositsByBlockRange($minBlock: BigInt!, $maxBlock: BigInt!, $limit: Int!, $offset: Int!) {
    bridgeDeposits(
      where: {
        and: [
          { blockHeight_gte: $minBlock }
          { blockHeight_lte: $maxBlock }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...BridgeDepositFields
    }
  }
`

/**
 * Get bridge deposits by timestamp range
 */
export const GET_BRIDGE_DEPOSITS_BY_TIME_RANGE = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  query GetBridgeDepositsByTimeRange($startTime: BigInt!, $endTime: BigInt!, $limit: Int!, $offset: Int!) {
    bridgeDeposits(
      where: {
        and: [
          { timestamp_gte: $startTime }
          { timestamp_lte: $endTime }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...BridgeDepositFields
    }
  }
`

/**
 * Get bridge deposit count for statistics
 */
export const GET_BRIDGE_DEPOSIT_COUNT = gql`
  query GetBridgeDepositCount {
    bridgeDepositsConnection {
      totalCount
    }
  }
`

/**
 * Get bridge deposit statistics
 */
export const GET_BRIDGE_DEPOSIT_STATS = gql`
  query GetBridgeDepositStats {
    bridgeDepositsConnection {
      totalCount
    }
    bridgeDepositsConnection(where: { reported_eq: true }) {
      totalCount
    }
    bridgeDepositsConnection(where: { claimed_eq: true }) {
      totalCount
    }
    bridgeDepositsConnection(where: { claimed_eq: false }) {
      totalCount
    }
  }
`

// ============================================================================
// WITHDRAWAL QUERIES
// ============================================================================

/**
 * Get all withdrawals
 */
export const GET_WITHDRAWS = gql`
  ${WITHDRAW_FIELDS}
  query GetWithdraws {
    withdraws {
      ...WithdrawFields
    }
  }
`

/**
 * Get withdrawals with pagination
 */
export const GET_WITHDRAWS_PAGINATED = gql`
  ${WITHDRAW_FIELDS}
  query GetWithdrawsPaginated($limit: Int!, $offset: Int!) {
    withdraws(
      first: $limit
      skip: $offset
      orderBy: blockHeight
      orderDirection: desc
    ) {
      ...WithdrawFields
    }
  }
`

/**
 * Get a specific withdrawal by deposit ID
 */
export const GET_WITHDRAW_BY_DEPOSIT_ID = gql`
  ${WITHDRAW_FIELDS}
  query GetWithdrawByDepositId($depositId: Int!) {
    withdraws(where: { depositId_eq: $depositId }, first: 1) {
      ...WithdrawFields
    }
  }
`

/**
 * Get withdrawals by sender address
 */
export const GET_WITHDRAWS_BY_SENDER = gql`
  ${WITHDRAW_FIELDS}
  query GetWithdrawsBySender($sender: String!, $limit: Int!, $offset: Int!) {
    withdraws(
      where: { sender_eq: $sender }
      first: $limit
      skip: $offset
      orderBy: blockHeight
      orderDirection: desc
    ) {
      ...WithdrawFields
    }
  }
`

/**
 * Get withdrawals by recipient address
 */
export const GET_WITHDRAWS_BY_RECIPIENT = gql`
  ${WITHDRAW_FIELDS}
  query GetWithdrawsByRecipient($recipient: String!, $limit: Int!, $offset: Int!) {
    withdraws(
      where: { recipient_eq: $recipient }
      first: $limit
      skip: $offset
      orderBy: blockHeight
      orderDirection: desc
    ) {
      ...WithdrawFields
    }
  }
`

/**
 * Get withdrawals by amount range
 */
export const GET_WITHDRAWS_BY_AMOUNT_RANGE = gql`
  ${WITHDRAW_FIELDS}
  query GetWithdrawsByAmountRange($minAmount: BigInt!, $maxAmount: BigInt!, $limit: Int!, $offset: Int!) {
    withdraws(
      where: {
        and: [
          { amount_gte: $minAmount }
          { amount_lte: $maxAmount }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: blockHeight
      orderDirection: desc
    ) {
      ...WithdrawFields
    }
  }
`

/**
 * Get withdrawals by block height range
 */
export const GET_WITHDRAWS_BY_BLOCK_RANGE = gql`
  ${WITHDRAW_FIELDS}
  query GetWithdrawsByBlockRange($minBlock: BigInt!, $maxBlock: BigInt!, $limit: Int!, $offset: Int!) {
    withdraws(
      where: {
        and: [
          { blockHeight_gte: $minBlock }
          { blockHeight_lte: $maxBlock }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: blockHeight
      orderDirection: desc
    ) {
      ...WithdrawFields
    }
  }
`

/**
 * Get withdrawal count for statistics
 */
export const GET_WITHDRAW_COUNT = gql`
  query GetWithdrawCount {
    withdrawsConnection {
      totalCount
    }
  }
`

/**
 * Get withdrawal statistics
 */
export const GET_WITHDRAW_STATS = gql`
  query GetWithdrawStats {
    withdrawsConnection {
      totalCount
    }
    withdraws(orderBy: blockHeight, orderDirection: desc, first: 1) {
      blockHeight
    }
    withdraws(orderBy: blockHeight, orderDirection: asc, first: 1) {
      blockHeight
    }
  }
`

// ============================================================================
// COMBINED BRIDGE QUERIES
// ============================================================================

/**
 * Get bridge activity by address (both deposits and withdrawals)
 */
export const GET_BRIDGE_ACTIVITY_BY_ADDRESS = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  ${WITHDRAW_FIELDS}
  query GetBridgeActivityByAddress($address: String!, $limit: Int!, $offset: Int!) {
    bridgeDeposits(
      where: {
        or: [
          { sender_eq: $address }
          { recipient_eq: $address }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...BridgeDepositFields
    }
    withdraws(
      where: {
        or: [
          { sender_eq: $address }
          { recipient_eq: $address }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: blockHeight
      orderDirection: desc
    ) {
      ...WithdrawFields
    }
  }
`

/**
 * Search bridge transactions
 */
export const SEARCH_BRIDGE_TRANSACTIONS = gql`
  ${BRIDGE_DEPOSIT_FIELDS}
  ${WITHDRAW_FIELDS}
  query SearchBridgeTransactions($searchTerm: String!, $limit: Int!, $offset: Int!) {
    bridgeDeposits(
      where: {
        or: [
          { sender_containsInsensitive: $searchTerm }
          { recipient_containsInsensitive: $searchTerm }
          { id_containsInsensitive: $searchTerm }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...BridgeDepositFields
    }
    withdraws(
      where: {
        or: [
          { sender_containsInsensitive: $searchTerm }
          { recipient_containsInsensitive: $searchTerm }
          { id_containsInsensitive: $searchTerm }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: blockHeight
      orderDirection: desc
    ) {
      ...WithdrawFields
    }
  }
`
