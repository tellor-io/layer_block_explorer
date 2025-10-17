import { gql } from '@apollo/client'
import { VALIDATOR_FIELDS, VALIDATOR_BASIC_FIELDS } from './fragments'

// ============================================================================
// VALIDATOR QUERIES
// ============================================================================

/**
 * Get all validators with full details
 */
export const GET_VALIDATORS = gql`
  query GetValidators {
    validators {
      edges {
        node {
          id
          operatorAddress
          consensusPubkey
          consensusAddress
          delegatorAddress
          jailed
          bondStatus
          tokens
          delegatorShares
          description
          unbondingHeight
          unbondingTime
          commission
          minSelfDelegation
          unbondingOnHoldRefCount
          unbondingIds
          missedBlocks
        }
      }
    }
  }
`

/**
 * Get validators with pagination and basic fields
 */
export const GET_VALIDATORS_BASIC = gql`
  query GetValidatorsBasic($limit: Int!) {
    validators(
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: tokens
      orderDirection: desc
    ) {
      edges {
        node {
          id
          operatorAddress
          consensusAddress
          jailed
          bondStatus
          tokens
          description
          commission
        }
      }
    }
  }
`

/**
 * Get validators with pagination and full details
 */
export const GET_VALIDATORS_PAGINATED = gql`
  query GetValidatorsPaginated($limit: Int!) {
    validators(
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: tokens
      orderDirection: desc
    ) {
      edges {
        node {
          id
          operatorAddress
          consensusPubkey
          consensusAddress
          delegatorAddress
          jailed
          bondStatus
          tokens
          delegatorShares
          description
          unbondingHeight
          unbondingTime
          commission
          minSelfDelegation
          unbondingOnHoldRefCount
          unbondingIds
          missedBlocks
        }
      }
    }
  }
`

/**
 * Get a specific validator by address
 */
export const GET_VALIDATOR_BY_ADDRESS = gql`
  query GetValidatorByAddress($address: String!) {
    validator(id: $address) {
      id
      operatorAddress
      consensusPubkey
      consensusAddress
      delegatorAddress
      jailed
      bondStatus
      tokens
      delegatorShares
      description
      unbondingHeight
      unbondingTime
      commission
      minSelfDelegation
      unbondingOnHoldRefCount
      unbondingIds
      missedBlocks
    }
  }
`

/**
 * Get validator by consensus address
 */
export const GET_VALIDATOR_BY_CONSENSUS_ADDRESS = gql`
  ${VALIDATOR_FIELDS}
  query GetValidatorByConsensusAddress($consensusAddress: String!) {
    validators(where: { consensusAddress_eq: $consensusAddress }, first: 1) {
      ...ValidatorFields
    }
  }
`

/**
 * Get active validators only
 */
export const GET_ACTIVE_VALIDATORS = gql`
  ${VALIDATOR_BASIC_FIELDS}
  query GetActiveValidators($limit: Int!) {
    validators(
      where: { bondStatus_eq: "BOND_STATUS_BONDED" }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: tokens
      orderDirection: desc
    ) {
      ...ValidatorBasicFields
    }
  }
`

/**
 * Get jailed validators
 */
export const GET_JAILED_VALIDATORS = gql`
  ${VALIDATOR_BASIC_FIELDS}
  query GetJailedValidators($limit: Int!) {
    validators(
      where: { jailed_eq: true }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: tokens
      orderDirection: desc
    ) {
      ...ValidatorBasicFields
    }
  }
`

/**
 * Get validators by bond status
 */
export const GET_VALIDATORS_BY_BOND_STATUS = gql`
  ${VALIDATOR_BASIC_FIELDS}
  query GetValidatorsByBondStatus(
    $bondStatus: String!
    $limit: Int!
  ) {
    validators(
      where: { bondStatus_eq: $bondStatus }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: tokens
      orderDirection: desc
    ) {
      ...ValidatorBasicFields
    }
  }
`

/**
 * Get validators with minimum stake
 */
export const GET_VALIDATORS_WITH_MIN_STAKE = gql`
  ${VALIDATOR_BASIC_FIELDS}
  query GetValidatorsWithMinStake(
    $minStake: BigInt!
    $limit: Int!
  ) {
    validators(
      where: { tokens_gte: $minStake }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: tokens
      orderDirection: desc
    ) {
      ...ValidatorBasicFields
    }
  }
`

/**
 * Get validators by commission rate range
 */
export const GET_VALIDATORS_BY_COMMISSION_RANGE = gql`
  query GetValidatorsByCommissionRange(
    $minCommission: String!
    $maxCommission: String!
    $limit: Int!
  ) {
    validators(
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: tokens
      orderDirection: desc
    ) {
      id
      operatorAddress
      consensusAddress
      jailed
      bondStatus
      tokens
      description
      commission
    }
  }
`

/**
 * Search validators by moniker or identity
 */
export const SEARCH_VALIDATORS = gql`
  query SearchValidators($searchTerm: String!, $limit: Int!) {
    validators(
      where: { operatorAddress_containsInsensitive: $searchTerm }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: tokens
      orderDirection: desc
    ) {
      id
      operatorAddress
      consensusAddress
      jailed
      bondStatus
      tokens
      description
      commission
    }
  }
`

/**
 * Get validator count for statistics
 */
export const GET_VALIDATOR_COUNT = gql`
  query GetValidatorCount {
    validatorsConnection {
      totalCount
    }
  }
`

/**
 * Get validator statistics
 */
export const GET_VALIDATOR_STATS = gql`
  query GetValidatorStats {
    validatorsConnection {
      totalCount
    }
    validatorsConnection(where: { bondStatus_eq: "BOND_STATUS_BONDED" }) {
      totalCount
    }
    validatorsConnection(where: { jailed_eq: true }) {
      totalCount
    }
    validators(orderBy: tokens, orderDirection: desc, first: 1) {
      tokens
    }
  }
`

/**
 * Get top validators by stake
 */
export const GET_TOP_VALIDATORS = gql`
  ${VALIDATOR_BASIC_FIELDS}
  query GetTopValidators($limit: Int!) {
    validators(first: $limit, orderBy: tokens, orderDirection: desc) {
      ...ValidatorBasicFields
    }
  }
`

/**
 * Get validators with delegations
 */
export const GET_VALIDATORS_WITH_DELEGATIONS = gql`
  ${VALIDATOR_FIELDS}
  query GetValidatorsWithDelegations($limit: Int!) {
    validators(
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: tokens
      orderDirection: desc
    ) {
      ...ValidatorFields
      delegations {
        id
        delegatorAddress
        shares
      }
    }
  }
`

/**
 * Get delegations for a specific validator
 */
export const GET_DELEGATIONS_BY_VALIDATOR = gql`
  query GetDelegationsByValidator(
    $validatorAddress: String!
    $limit: Int!
  ) {
    delegations(
      where: { validatorAddress: { id_eq: $validatorAddress } }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: shares
      orderDirection: desc
    ) {
      id
      delegatorAddress
      shares
      validatorAddress {
        id
        operatorAddress
        description {
          moniker
        }
      }
    }
  }
`

/**
 * Get delegations by delegator address
 */
export const GET_DELEGATIONS_BY_DELEGATOR = gql`
  query GetDelegationsByDelegator(
    $delegatorAddress: String!
    $limit: Int!
  ) {
    delegations(
      where: { delegatorAddress_eq: $delegatorAddress }
      first: $limit
      # skip: $offset  # Not supported by schema
      orderBy: shares
      orderDirection: desc
    ) {
      id
      delegatorAddress
      shares
      validatorAddress {
        id
        operatorAddress
        description {
          moniker
        }
        tokens
        bondStatus
      }
    }
  }
`
