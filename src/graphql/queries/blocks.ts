import { gql } from '@apollo/client'
import { BLOCK_FIELDS, BLOCK_BASIC_FIELDS } from './fragments'

// ============================================================================
// BLOCK QUERIES
// ============================================================================

/**
 * Get the latest block with full details
 */
export const GET_LATEST_BLOCK = gql`
  query GetLatestBlock {
    blocks(first: 1, orderBy: BLOCK_HEIGHT_DESC) {
      edges {
        node {
          id
          blockHeight
          blockHash
          blockTime
          appHash
          chainId
          consensusHash
          dataHash
          evidenceHash
          nextValidatorsHash
          validatorsHash
          proposerAddress
          numberOfTx
          voteExtensions
        }
      }
    }
  }
`

/**
 * Get a specific block by height
 */
export const GET_BLOCK_BY_HEIGHT = gql`
  query GetBlockByHeight($height: BigInt!) {
    block(blockHeight: $height) {
      id
      blockHeight
      blockHash
      blockTime
      appHash
      chainId
      consensusHash
      dataHash
      evidenceHash
      nextValidatorsHash
      validatorsHash
      proposerAddress
      numberOfTx
      voteExtensions
    }
  }
`

/**
 * Get a specific block by hash
 */
export const GET_BLOCK_BY_HASH = gql`
  query GetBlockByHash($hash: String!) {
    blocks(where: { blockHash_eq: $hash }, first: 1) {
      edges {
        node {
          id
          blockHeight
          blockHash
          blockTime
          appHash
          chainId
          consensusHash
          dataHash
          evidenceHash
          nextValidatorsHash
          validatorsHash
          proposerAddress
          numberOfTx
          voteExtensions
        }
      }
    }
  }
`

/**
 * Get blocks with pagination and basic fields
 * NOTE: The GraphQL schema doesn't support 'skip' argument for pagination.
 * Using 'first' only for now. For proper pagination, cursor-based pagination
 * or a different approach may be needed.
 */
export const GET_BLOCKS_BASIC = gql`
  query GetBlocksBasic($limit: Int!) {
    blocks(first: $limit, orderBy: BLOCK_HEIGHT_DESC) {
      edges {
        node {
          id
          blockHeight
          blockHash
          blockTime
          proposerAddress
          numberOfTx
        }
      }
    }
  }
`

/**
 * Get blocks with pagination and full details
 * NOTE: The GraphQL schema doesn't support 'skip' argument for pagination.
 * Using 'first' only for now. For proper pagination, cursor-based pagination
 * or a different approach may be needed.
 */
export const GET_BLOCKS = gql`
  query GetBlocks($limit: Int!) {
    blocks(first: $limit, orderBy: BLOCK_HEIGHT_DESC) {
      edges {
        node {
          id
          blockHeight
          blockHash
          blockTime
          appHash
          chainId
          consensusHash
          dataHash
          evidenceHash
          nextValidatorsHash
          validatorsHash
          proposerAddress
          numberOfTx
          voteExtensions
        }
      }
    }
  }
`

/**
 * Get blocks by proposer address
 */
export const GET_BLOCKS_BY_PROPOSER = gql`
  ${BLOCK_BASIC_FIELDS}
  query GetBlocksByProposer($proposerAddress: String!, $limit: Int!) {
    blocks(
      where: { proposerAddress_eq: $proposerAddress }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: blockHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...BlockBasicFields
        }
      }
    }
  }
`

/**
 * Get blocks within a time range
 */
export const GET_BLOCKS_BY_TIME_RANGE = gql`
  ${BLOCK_BASIC_FIELDS}
  query GetBlocksByTimeRange(
    $startTime: DateTime!
    $endTime: DateTime!
    $limit: Int!
  ) {
    blocks(
      where: { blockTime_gte: $startTime, blockTime_lte: $endTime }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: blockHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...BlockBasicFields
        }
      }
    }
  }
`

/**
 * Get blocks with minimum transaction count
 */
export const GET_BLOCKS_WITH_MIN_TXS = gql`
  ${BLOCK_BASIC_FIELDS}
  query GetBlocksWithMinTxs($minTxs: Int!, $limit: Int!) {
    blocks(
      where: { numberOfTx_gte: $minTxs }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: blockHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...BlockBasicFields
        }
      }
    }
  }
`

/**
 * Get block count for statistics
 */
export const GET_BLOCK_COUNT = gql`
  query GetBlockCount {
    blocksConnection {
      totalCount
    }
  }
`

/**
 * Get block statistics
 */
export const GET_BLOCK_STATS = gql`
  query GetBlockStats {
    blocksConnection {
      totalCount
    }
    blocks(orderBy: blockHeight, orderDirection: desc, first: 1) {
      blockHeight
    }
    blocks(orderBy: blockHeight, orderDirection: asc, first: 1) {
      blockHeight
    }
  }
`

/**
 * Get blocks with vote extensions
 */
export const GET_BLOCKS_WITH_VOTE_EXTENSIONS = gql`
  ${BLOCK_FIELDS}
  query GetBlocksWithVoteExtensions($limit: Int!) {
    blocks(
      where: { voteExtensions_isNull: false }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: blockHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...BlockFields
        }
      }
    }
  }
`

/**
 * Search blocks by various criteria
 */
export const SEARCH_BLOCKS = gql`
  ${BLOCK_BASIC_FIELDS}
  query SearchBlocks($searchTerm: String!, $limit: Int!) {
    blocks(
      where: {
        or: [
          { blockHash_containsInsensitive: $searchTerm }
          { proposerAddress_containsInsensitive: $searchTerm }
        ]
      }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: blockHeight
      orderDirection: desc
    ) {
      edges {
        node {
          ...BlockBasicFields
        }
      }
    }
  }
`
