import { gql } from '@apollo/client'

// ============================================================================
// BLOCK FRAGMENTS
// ============================================================================

export const BLOCK_FIELDS = gql`
  fragment BlockFields on Block {
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
`

export const BLOCK_BASIC_FIELDS = gql`
  fragment BlockBasicFields on Block {
    id
    blockHeight
    blockHash
    blockTime
    proposerAddress
    numberOfTx
  }
`

// ============================================================================
// TRANSACTION FRAGMENTS
// ============================================================================

export const TRANSACTION_FIELDS = gql`
  fragment TransactionFields on Transaction {
    id
    txData
    blockHeight
    timestamp
  }
`

// ============================================================================
// VALIDATOR FRAGMENTS
// ============================================================================

export const VALIDATOR_FIELDS = gql`
  fragment ValidatorFields on Validator {
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
`

export const VALIDATOR_BASIC_FIELDS = gql`
  fragment ValidatorBasicFields on Validator {
    id
    operatorAddress
    consensusAddress
    jailed
    bondStatus
    tokens
    description
    commission
  }
`

// ============================================================================
// REPORTER FRAGMENTS
// ============================================================================

export const REPORTER_FIELDS = gql`
  fragment ReporterFields on Reporter {
    id
    creationHeight
    commissionRate
    lastUpdated
    minTokensRequired
    moniker
    jailed
    jailedUntil
  }
`

// ============================================================================
// AGGREGATE REPORT FRAGMENTS
// ============================================================================

export const AGGREGATE_REPORT_FIELDS = gql`
  fragment AggregateReportFields on AggregateReport {
    id
    queryId
    queryData
    value
    aggregatePower
    microReportHeight
    blockHeight
    timestamp
    flagged
    totalReporters
    totalPower
    cyclist
  }
`

// ============================================================================
// BRIDGE FRAGMENTS
// ============================================================================

export const BRIDGE_DEPOSIT_FIELDS = gql`
  fragment BridgeDepositFields on BridgeDeposit {
    id
    depositId
    blockHeight
    timestamp
    sender
    recipient
    amount
    tip
    reported
    claimed
  }
`

export const WITHDRAW_FIELDS = gql`
  fragment WithdrawFields on Withdraw {
    id
    depositId
    blockHeight
    sender
    recipient
    amount
  }
`

// ============================================================================
// GOVERNANCE FRAGMENTS
// ============================================================================

export const GOV_PROPOSAL_FIELDS = gql`
  fragment GovProposalFields on GovProposal {
    id
    proposalId
    messages
    status
    submitTime
    depositEndTime
    votingStartTime
    votingEndTime
    metaData
    title
    summary
    proposer
    expedited
  }
`

export const VOTE_FIELDS = gql`
  fragment VoteFields on Vote {
    id
    proposal {
      id
      proposalId
      status
    }
    option {
      VoteOption
      Weight
    }
    metaData
  }
`

// ============================================================================
// PARAMETERS FRAGMENTS
// ============================================================================

export const STAKING_PARAMS_FIELDS = gql`
  fragment StakingParamsFields on StakingParams {
    id
    unbondingTime
    maxValidators
    maxEntries
    historicalEntries
    bondDenom
    minCommissionRate
  }
`

export const GOV_PARAMS_FIELDS = gql`
  fragment GovParamsFields on GovParams {
    id
    minDeposit {
      denom
      amount
    }
    maxDepositPeriod
    votingPeriod
    quorum
    threshold
    vetoThreshold
    minInitialDepositRatio
    proposalCancelRatio
    proposalCancelDest
    expeditedVotingPeriod
    expeditedThreshold
    expeditedMinDeposit {
      denom
      amount
    }
    burnVoteQuorum
    burnProposalDepositPrevote
    burnVoteVeto
    minDepositRatio
  }
`

export const ORACLE_PARAMS_FIELDS = gql`
  fragment OracleParamsFields on OracleParams {
    id
    minStakeAmount
    minTipAmount
    maxTipAmount
  }
`

// ============================================================================
// PAGINATION FRAGMENTS
// ============================================================================

export const PAGINATION_INFO = gql`
  fragment PaginationInfo on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`
