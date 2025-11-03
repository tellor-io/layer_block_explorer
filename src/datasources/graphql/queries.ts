/**
 * GraphQL Query Definitions for Tellor Layer Block Explorer
 * 
 * All query strings for fetching data from the GraphQL indexer at https://subgraph.sagemode.me
 */

// ============================================================================
// BLOCK QUERIES
// ============================================================================

/**
 * Get latest blocks with pagination
 * Used for: /blocks page, dashboard latest blocks
 */
export const GET_LATEST_BLOCKS = `
  query GetLatestBlocks($first: Int, $after: Cursor, $last: Int, $before: Cursor) {
    blocks(first: $first, after: $after, last: $last, before: $before, orderBy: BLOCK_HEIGHT_DESC) {
      edges {
        node {
          blockHeight
          blockHash
          blockTime
          proposerAddress
          numberOfTx
          appHash
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Get a single block by height
 * Used for: /blocks/[height] page
 */
export const GET_BLOCK_BY_HEIGHT = `
  query GetBlockByHeight($blockHeight: String!) {
    block(id: $blockHeight) {
      blockHeight
      blockHash
      blockTime
      proposerAddress
      numberOfTx
      appHash
    }
  }
`;

/**
 * Get latest block for dashboard stats
 * Used for: dashboard stats (get latest block height)
 */
export const GET_LATEST_BLOCK_HEIGHT = `
  query GetLatestBlockHeight {
    blocks(first: 1) {
      edges {
        node {
          blockHeight
        }
      }
    }
  }
`;

// ============================================================================
// VALIDATOR QUERIES
// ============================================================================

/**
 * Get all validators with pagination
 * Used for: /validators page
 */
export const GET_VALIDATORS = `
  query GetValidators($first: Int, $after: Cursor) {
    validators(first: $first, after: $after) {
      edges {
        node {
          operatorAddress
          consensusPubkey
          consensusAddress
          bondStatus
          tokens
          commission
          description
          jailed
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Get a single validator by operator address
 * Used for: validator detail pages
 */
export const GET_VALIDATOR_BY_ADDRESS = `
  query GetValidatorByAddress($operatorAddress: String!) {
    validator(id: $operatorAddress) {
      operatorAddress
      consensusPubkey
      bondStatus
      tokens
      commission
      description
      jailed
    }
  }
`;

/**
 * Get validator count for dashboard stats
 * Used for: dashboard stats (get validator count)
 */
export const GET_VALIDATOR_COUNT = `
  query GetValidatorCount {
    validators(first: 1) {
      edges {
        node {
          operatorAddress
        }
      }
    }
  }
`;

// ============================================================================
// DELEGATION QUERIES
// ============================================================================

/**
 * Get delegations for a specific validator
 * Used for: validator detail pages, delegation counts
 */
export const GET_DELEGATIONS_BY_VALIDATOR = `
  query GetDelegationsByValidator($validatorAddressId: String!, $first: Int, $after: Cursor) {
    delegations(first: $first, after: $after, filter: { validatorAddressId: { equalTo: $validatorAddressId } }) {
      edges {
        node {
          delegatorAddress
          validatorAddressId
          shares
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Get all delegations with pagination
 * Used for: delegation overview
 */
export const GET_DELEGATIONS = `
  query GetDelegations($first: Int, $after: Cursor) {
    delegations(first: $first, after: $after) {
      edges {
        node {
          delegatorAddress
          validatorAddressId
          shares
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Get delegation count for dashboard stats
 * Used for: dashboard stats (get delegation count)
 */
export const GET_DELEGATION_COUNT = `
  query GetDelegationCount {
    delegations(first: 1) {
      edges {
        node {
          delegatorAddress
        }
      }
    }
  }
`;

// ============================================================================
// GOVERNANCE QUERIES
// ============================================================================

/**
 * Get governance proposals with pagination
 * Used for: /proposals page
 */
export const GET_GOV_PROPOSALS = `
  query GetGovProposals($first: Int, $after: Cursor) {
    govProposals(first: $first, after: $after) {
      edges {
        node {
          proposalId
          title
          status
          submitTime
          votingStartTime
          votingEndTime
          messages
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Get a single governance proposal by ID
 * Used for: proposal detail pages
 */
export const GET_GOV_PROPOSAL_BY_ID = `
  query GetGovProposalById($proposalId: Int!) {
    govProposal(id: $proposalId) {
      proposalId
      title
      status
      submitTime
      votingStartTime
      votingEndTime
      messages
    }
  }
`;

/**
 * Get governance proposal count for dashboard stats
 * Used for: dashboard stats (get proposal count)
 */
export const GET_GOV_PROPOSAL_COUNT = `
  query GetGovProposalCount {
    govProposals(first: 1) {
      edges {
        node {
          proposalId
        }
      }
    }
  }
`;

// ============================================================================
// REPORTER QUERIES
// ============================================================================

/**
 * Get reporters with pagination
 * Used for: /reporters page
 */
export const GET_REPORTERS = `
  query GetReporters($first: Int, $after: Cursor) {
    reporters(first: $first, after: $after) {
      edges {
        node {
          id
          creationHeight
          commissionRate
          lastUpdated
          minTokensRequired
          moniker
          jailed
          jailedUntil
          selectors {
            totalCount
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Get reporter count for dashboard stats
 * Used for: dashboard stats (get reporter count)
 */
export const GET_REPORTER_COUNT = `
  query GetReporterCount {
    reporters(first: 1) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

// ============================================================================
// TRANSACTION QUERIES
// ============================================================================

/**
 * Get transactions with pagination
 * Used for: /transactions page
 */
export const GET_TRANSACTIONS = `
  query GetTransactions($first: Int, $after: Cursor) {
    transactions(first: $first, after: $after) {
      edges {
        node {
          nodeId
          id
          txData
          blockHeight
          timestamp
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Get a single transaction by ID
 * Used for: /txs/[hash] page
 */
export const GET_TRANSACTION_BY_HASH = `
  query GetTransactionByHash($id: String!) {
    transaction(id: $id) {
      nodeId
      id
      txData
      blockHeight
      timestamp
    }
  }
`;

/**
 * Get transactions by account address
 * Used for: /accounts/[address] page
 */
export const GET_TRANSACTIONS_BY_ACCOUNT = `
  query GetTransactionsByAccount($address: String!, $first: Int, $after: Cursor) {
    transactions(first: $first, after: $after, where: { txData: { contains: $address } }) {
      edges {
        node {
          nodeId
          id
          txData
          blockHeight
          timestamp
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Get transaction count for dashboard stats
 * Used for: dashboard stats (get transaction count)
 */
export const GET_TRANSACTION_COUNT = `
  query GetTransactionCount {
    transactions(first: 1) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

// ============================================================================
// DASHBOARD QUERIES
// ============================================================================

/**
 * Get comprehensive dashboard data
 * Used for: home page dashboard (combines multiple queries)
 */
export const GET_DASHBOARD_DATA = `
  query GetDashboardData {
    latestBlocks: blocks(first: 5) {
      edges {
        node {
          blockHeight
          blockHash
          blockTime
          proposerAddress
          numberOfTx
        }
      }
    }
    validators: validators(first: 10) {
      edges {
        node {
          operatorAddress
          bondStatus
          tokens
          jailed
        }
      }
    }
    proposals: govProposals(first: 5) {
      edges {
        node {
          proposalId
          title
          status
          submitTime
        }
      }
    }
  }
`;

/**
 * Get dashboard statistics - validators count and voting power
 * Used for: dashboard validator stats
 */
export const GET_DASHBOARD_VALIDATORS = `
  query GetDashboardValidators {
    validators(first: 200) {
      edges {
        node {
          operatorAddress
          bondStatus
          tokens
          jailed
          description
        }
      }
    }
  }
`;

/**
 * Get dashboard statistics - reporters count
 * Used for: dashboard reporter stats
 */
export const GET_DASHBOARD_REPORTERS = `
  query GetDashboardReporters {
    reporters(first: 100) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

/**
 * Get latest block for dashboard
 * Used for: dashboard latest block stats
 */
export const GET_DASHBOARD_LATEST_BLOCK = `
  query GetDashboardLatestBlock {
    blocks(first: 10, orderBy: BLOCK_HEIGHT_DESC) {
      edges {
        node {
          blockHeight
          blockTime
        }
      }
    }
  }
`;

/**
 * Get single latest block for dashboard (more reliable)
 * Used for: dashboard latest block stats when we need just one block
 */
export const GET_SINGLE_LATEST_BLOCK = `
  query GetSingleLatestBlock {
    blocks(first: 1, orderBy: BLOCK_HEIGHT_DESC) {
      edges {
        node {
          blockHeight
          blockTime
        }
      }
    }
  }
`;

// ============================================================================
// PARAMETER QUERIES
// ============================================================================

/**
 * Get all parameter types for the parameters page
 * Used for: /parameters page
 */
export const GET_ALL_PARAMETERS = `
  query GetAllParameters {
    disputeParams(first: 1) {
      edges {
        node {
          id
          disputeFee
          slashAmount
          slashCount
          slashWindow
        }
      }
    }
    distributionParams(first: 1) {
      edges {
        node {
          id
          communityTax
          baseProposerReward
          bonusProposerReward
          withdrawAddrEnabled
        }
      }
    }
    govParams(first: 1) {
      edges {
        node {
          id
          votingParams
          tallyParams
          depositParams
        }
      }
    }
    oracleParams(first: 1) {
      edges {
        node {
          id
          maxDataPoints
          maxValueLength
          maxReporters
          minValidReports
          reportFrequency
          reportExpiration
        }
      }
    }
    registryParams(first: 1) {
      edges {
        node {
          id
          stakeAmount
          stakeToken
          governanceToken
          reporterAddress
        }
      }
    }
    reporterParams(first: 1) {
      edges {
        node {
          id
          reporterStake
          reporterPayout
          reporterSlash
        }
      }
    }
    slashingParams(first: 1) {
      edges {
        node {
          id
          signedBlocksWindow
          minSignedPerWindow
          downtimeJailDuration
          slashFractionDoubleSign
          slashFractionDowntime
        }
      }
    }
    stakingParams(first: 1) {
      edges {
        node {
          id
          bondDenom
          maxValidators
          maxEntries
          historicalEntries
          bondDuration
          minCommissionRate
        }
      }
    }
  }
`;

// ============================================================================
// AGGREGATE REPORT QUERIES
// ============================================================================

/**
 * Get latest aggregate reports with pagination
 * Used for: /data-feed page (real-time oracle reports)
 * 
 * Note: queryType and aggregateMethod are not available in GraphQL aggregateReports.
 * These may need to be fetched from RPC /api/reporter-count or may be available
 * in queryData field if decoded.
 */
export const GET_LATEST_AGGREGATE_REPORTS = `
  query GetLatestAggregateReports($first: Int, $after: Cursor, $orderBy: AggregateReportOrderBy) {
    aggregateReports(first: $first, after: $after, orderBy: $orderBy) {
      edges {
        node {
          id
          queryId
          value
          queryData
          blockHeight
          timestamp
          microReportHeight
          totalReporters
          totalPower
          cyclist
          aggregatePower
          flagged
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Get aggregate reports by query ID
 * Used for: filtering reports by specific query
 */
export const GET_AGGREGATE_REPORTS_BY_QUERY_ID = `
  query GetAggregateReportsByQueryId($queryId: String!, $first: Int, $after: Cursor) {
    aggregateReports(
      first: $first
      after: $after
      filter: { queryId: { equalTo: $queryId } }
      orderBy: BLOCK_HEIGHT_DESC
    ) {
      edges {
        node {
          id
          queryId
          value
          queryData
          blockHeight
          timestamp
          microReportHeight
          totalReporters
          totalPower
          cyclist
          aggregatePower
          flagged
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Get single latest aggregate reports for polling
 * Used for: /data-feed page (real-time updates via polling)
 * 
 * Matches AggregateReport.create structure:
 * - id (composite: queryId-blockHeight)
 * - blockHeight
 * - timestamp
 * - queryId
 * - queryData
 * - value
 * - aggregatePower
 * - microReportHeight
 */
export const GET_SINGLE_LATEST_AGGREGATE_REPORTS = `
  query GetSingleLatestAggregateReports($first: Int) {
    aggregateReports(first: $first, orderBy: BLOCK_HEIGHT_DESC) {
      edges {
        node {
          id
          queryId
          value
          queryData
          blockHeight
          timestamp
          microReportHeight
          aggregatePower
          flagged
        }
      }
    }
  }
`;
