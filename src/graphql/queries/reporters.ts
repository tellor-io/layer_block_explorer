import { gql } from '@apollo/client'
import { REPORTER_FIELDS } from './fragments'

// ============================================================================
// REPORTER QUERIES
// ============================================================================

/**
 * Get all reporters with full details
 */
export const GET_REPORTERS = gql`
  ${REPORTER_FIELDS}
  query GetReporters {
    reporters {
      edges {
        node {
          ...ReporterFields
        }
      }
    }
  }
`

/**
 * Get reporters with pagination
 */
export const GET_REPORTERS_PAGINATED = gql`
  ${REPORTER_FIELDS}
  query GetReportersPaginated($limit: Int!) {
    reporters(
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: creationHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...ReporterFields
        }
      }
    }
  }
`

/**
 * Get a specific reporter by address
 */
export const GET_REPORTER_BY_ADDRESS = gql`
  ${REPORTER_FIELDS}
  query GetReporterByAddress($address: String!) {
    reporter(id: $address) {
      ...ReporterFields
    }
  }
`

/**
 * Get active reporters (not jailed)
 */
export const GET_ACTIVE_REPORTERS = gql`
  ${REPORTER_FIELDS}
  query GetActiveReporters($limit: Int!) {
    reporters(
      where: { jailed_eq: false }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: creationHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...ReporterFields
        }
      }
    }
  }
`

/**
 * Get jailed reporters
 */
export const GET_JAILED_REPORTERS = gql`
  ${REPORTER_FIELDS}
  query GetJailedReporters($limit: Int!) {
    reporters(
      where: { jailed_eq: true }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: creationHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...ReporterFields
        }
      }
    }
  }
`

/**
 * Get reporters by commission rate range
 */
export const GET_REPORTERS_BY_COMMISSION_RANGE = gql`
  ${REPORTER_FIELDS}
  query GetReportersByCommissionRange(
    $minCommission: BigInt!
    $maxCommission: BigInt!
    $limit: Int!
  ) {
    reporters(
      where: {
        and: [
          { commissionRate_gte: $minCommission }
          { commissionRate_lte: $maxCommission }
        ]
      }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: creationHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...ReporterFields
        }
      }
    }
  }
`

/**
 * Get reporters with minimum tokens required
 */
export const GET_REPORTERS_WITH_MIN_TOKENS = gql`
  ${REPORTER_FIELDS}
  query GetReportersWithMinTokens(
    $minTokens: BigInt!
    $limit: Int!
  ) {
    reporters(
      where: { minTokensRequired_gte: $minTokens }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: creationHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...ReporterFields
        }
      }
    }
  }
`

/**
 * Search reporters by moniker or address
 */
export const SEARCH_REPORTERS = gql`
  ${REPORTER_FIELDS}
  query SearchReporters($searchTerm: String!, $limit: Int!) {
    reporters(
      where: {
        or: [
          { moniker_containsInsensitive: $searchTerm }
          { id_containsInsensitive: $searchTerm }
        ]
      }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: creationHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...ReporterFields
        }
      }
    }
  }
`

/**
 * Get reporter count for statistics
 */
export const GET_REPORTER_COUNT = gql`
  query GetReporterCount {
    reportersConnection {
      totalCount
    }
  }
`

/**
 * Get reporter statistics
 */
export const GET_REPORTER_STATS = gql`
  query GetReporterStats {
    reportersConnection {
      totalCount
    }
    reportersConnection(where: { jailed_eq: false }) {
      totalCount
    }
    reportersConnection(where: { jailed_eq: true }) {
      totalCount
    }
    reporters(orderBy: creationHeight, orderDirection: desc, first: 1) {
      creationHeight
    }
  }
`

/**
 * Get reporters by creation height range
 */
export const GET_REPORTERS_BY_CREATION_HEIGHT = gql`
  ${REPORTER_FIELDS}
  query GetReportersByCreationHeight(
    $minHeight: BigInt!
    $maxHeight: BigInt!
    $limit: Int!
  ) {
    reporters(
      where: {
        and: [
          { creationHeight_gte: $minHeight }
          { creationHeight_lte: $maxHeight }
        ]
      }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: creationHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...ReporterFields
        }
      }
    }
  }
`

/**
 * Get reporters by last updated time
 */
export const GET_REPORTERS_BY_LAST_UPDATED = gql`
  ${REPORTER_FIELDS}
  query GetReportersByLastUpdated(
    $startTime: DateTime!
    $endTime: DateTime!
    $limit: Int!
  ) {
    reporters(
      where: {
        and: [{ lastUpdated_gte: $startTime }, { lastUpdated_lte: $endTime }]
      }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: lastUpdated
      orderDirection: desc
    ) {
      edges {
        node {
          ...ReporterFields
        }
      }
    }
  }
`

/**
 * Get reporters with selectors
 */
export const GET_REPORTERS_WITH_SELECTORS = gql`
  ${REPORTER_FIELDS}
  query GetReportersWithSelectors($limit: Int!) {
    reporters(
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: creationHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...ReporterFields
          selectors {
            id
            lockedUntilTime
          }
        }
      }
    }
  }
`

/**
 * Get selectors for a specific reporter
 */
export const GET_SELECTORS_BY_REPORTER = gql`
  query GetSelectorsByReporter(
    $reporterAddress: String!
    $limit: Int!
  ) {
    selectors(
      where: { reporterAddress_eq: $reporterAddress }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: lockedUntilTime
      orderDirection: desc
    ) {
      id
      reporterAddress
      lockedUntilTime
    }
  }
`

/**
 * Get selectors by lock time range
 */
export const GET_SELECTORS_BY_LOCK_TIME = gql`
  query GetSelectorsByLockTime(
    $startTime: DateTime!
    $endTime: DateTime!
    $limit: Int!
  ) {
    selectors(
      where: {
        and: [
          { lockedUntilTime_gte: $startTime }
          { lockedUntilTime_lte: $endTime }
        ]
      }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: lockedUntilTime
      orderDirection: desc
    ) {
      id
      reporterAddress
      lockedUntilTime
    }
  }
`

/**
 * Get active selectors (not expired)
 */
export const GET_ACTIVE_SELECTORS = gql`
  query GetActiveSelectors(
    $currentTime: DateTime!
    $limit: Int!
  ) {
    selectors(
      where: { lockedUntilTime_gt: $currentTime }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: lockedUntilTime
      orderDirection: desc
    ) {
      id
      reporterAddress
      lockedUntilTime
    }
  }
`

/**
 * Get expired selectors
 */
export const GET_EXPIRED_SELECTORS = gql`
  query GetExpiredSelectors(
    $currentTime: DateTime!
    $limit: Int!
  ) {
    selectors(
      where: { lockedUntilTime_lte: $currentTime }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: lockedUntilTime
      orderDirection: desc
    ) {
      id
      reporterAddress
      lockedUntilTime
    }
  }
`

/**
 * Get selector count for statistics
 */
export const GET_SELECTOR_COUNT = gql`
  query GetSelectorCount {
    selectorsConnection {
      totalCount
    }
  }
`

/**
 * Get selector statistics
 */
export const GET_SELECTOR_STATS = gql`
  query GetSelectorStats($currentTime: DateTime!) {
    selectorsConnection {
      totalCount
    }
    selectorsConnection(where: { lockedUntilTime_gt: $currentTime }) {
      totalCount
    }
    selectorsConnection(where: { lockedUntilTime_lte: $currentTime }) {
      totalCount
    }
  }
`
