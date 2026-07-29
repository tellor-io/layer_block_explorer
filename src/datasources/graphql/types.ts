/**
 * TypeScript Type Definitions for GraphQL Responses
 * 
 * Type definitions matching the GraphQL schema responses from https://subgraph.sagemode.me
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface Edge<T> {
  node: T;
  cursor: string;
}

export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
}

// ============================================================================
// BLOCK TYPES
// ============================================================================

export interface Block {
  blockHeight: string;
  blockHash: string; // Comma-separated byte string
  blockTime: string; // ISO timestamp
  proposerAddress: string; // Comma-separated byte string
  numberOfTx: number;
  appHash: string; // Comma-separated byte string
  chainId: string;
  voteExtensions?: string; // Vote extension data as JSON string (parsed by indexer)
  consensusHash?: string; // Comma-separated byte string
  dataHash?: string; // Comma-separated byte string
  evidenceHash?: string; // Comma-separated byte string
  nextValidatorsHash?: string; // Comma-separated byte string
  validatorsHash?: string; // Comma-separated byte string
}

export interface BlocksResponse {
  blocks: Connection<Block>;
}

export interface BlockResponse {
  block: Block | null;
}

// ============================================================================
// VALIDATOR TYPES
// ============================================================================

export interface CommissionRates {
  rate: string;
  maxRate: string;
  maxChangeRate: string;
}

export interface Commission {
  updateTime: string; // ISO timestamp
  commissionRates: CommissionRates;
}

export interface ValidatorDescription {
  details: string;
  moniker: string;
  website: string;
  identity: string;
  securityContact?: string;
  security_contact?: string; // Alternative field name
}

export interface Validator {
  operatorAddress: string;
  consensusPubkey: string; // JSON string
  consensusAddress: string; // Bech32 consensus address
  bondStatus: 'BOND_STATUS_BONDED' | 'BOND_STATUS_UNBONDING' | 'BOND_STATUS_UNBONDED';
  tokens: string;
  commission: string; // JSON string
  description: string; // JSON string
  jailed: boolean;
}

export interface ValidatorsResponse {
  validators: Connection<Validator>;
}

export interface ValidatorResponse {
  validator: Validator | null;
}

// ============================================================================
// DELEGATION TYPES
// ============================================================================

export interface Delegation {
  delegatorAddress: string;
  validatorAddressId: string;
  shares: string;
}

export interface DelegationsResponse {
  delegations: Connection<Delegation>;
}

// ============================================================================
// GOVERNANCE TYPES
// ============================================================================

export interface GovProposal {
  proposalId: number;
  title: string | null;
  summary: string;
  metaData: string;
  proposer: string | null;
  expedited: boolean;
  status: 'proposal_deposit_period' | 'proposal_voting_period' | 'proposal_passed' | 'proposal_rejected' | 'proposal_failed' | 'proposal_dropped' | 'PROPOSAL_STATUS_VOTING_PERIOD';
  submitTime: string; // ISO timestamp
  depositEndTime: string | null; // ISO timestamp
  votingStartTime: string; // ISO timestamp
  votingEndTime: string; // ISO timestamp
  messages: string; // Comma-separated message types
  tallyResults?: string | null; // JSON string: {"tally":{"yes_count":"...","abstain_count":"...","no_count":"...","no_with_veto_count":"..."},"totalPower":"..."}
}

export interface GovProposalsResponse {
  govProposals: Connection<GovProposal>;
}

export interface GovProposalResponse {
  govProposal: GovProposal | null;
}

// ============================================================================
// REPORTER TYPES
// ============================================================================

export interface Reporter {
  id: string;
  creationHeight: string;
  commissionRate: string;
  lastUpdated: string;
  minTokensRequired: string;
  moniker: string;
  jailed: boolean;
  jailedUntil: string;
  selectors: {
    totalCount: number;
  };
}

export interface ReportersResponse {
  reporters: Connection<Reporter>;
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export interface Transaction {
  nodeId: string;
  id: string;
  txData: string; // Raw transaction data
  blockHeight: string;
  timestamp: string; // ISO timestamp
}

export interface TransactionsResponse {
  transactions: Connection<Transaction>;
}

export interface TransactionResponse {
  transaction: Transaction | null;
}

// ============================================================================
// PARAMETER TYPES
// ============================================================================

export interface DisputeParam {
  id: string;
  disputeFee: string;
  slashAmount: string;
  slashCount: string;
  slashWindow: string;
}

export interface DistributionParam {
  id: string;
  communityTax: string;
  baseProposerReward: string;
  bonusProposerReward: string;
  withdrawAddrEnabled: boolean;
}

export interface Coin {
  denom: string;
  amount: string;
}

export interface GovParam {
  id: string;
  quorum: string;
  votingPeriod: string;
  threshold: string;
  vetoThreshold: string;
  minDeposit: Coin[];
  maxDepositPeriod: string;
  minInitialDepositRatio: string;
  proposalCancelRatio: string;
  proposalCancelDest: string;
  expeditedVotingPeriod: string;
  expeditedThreshold: string;
  expeditedMinDeposit: Coin[];
  burnVoteQuorum: boolean;
  burnProposalDepositPrevote: boolean;
  burnVoteVeto: boolean;
  minDepositRatio: string;
}

export interface OracleParam {
  id: string;
  minStakeAmount: string;
  minTipAmount: string;
  maxTipAmount: string;
}

export interface RegistryParam {
  id: string;
  maxReportBufferWindow: string;
}

export interface ReporterParam {
  id: string;
  minCommissionRate: string;
  minLoya: string;
  maxSelectors: string;
  maxNumOfDelegations: string;
}

export interface SlashingParam {
  id: string;
  signedBlocksWindow: string;
  minSignedPerWindow: string;
  downtimeJailDuration: string;
  slashFractionDoubleSign: string;
  slashFractionDowntime: string;
}

export interface StakingParam {
  id: string;
  bondDenom: string;
  maxValidators: string;
  maxEntries: string;
  historicalEntries: string;
  bondDuration: string;
  minCommissionRate: string;
}

// ============================================================================
// DASHBOARD DATA TYPES
// ============================================================================

export interface DashboardData {
  latestBlocks: Connection<Block>;
  validators: Connection<Validator>;
  proposals: Connection<GovProposal>;
}

export interface DashboardDataResponse {
  latestBlocks: Connection<Block>;
  validators: Connection<Validator>;
  proposals: Connection<GovProposal>;
}

export interface DashboardValidatorsResponse {
  validators: Connection<Validator>;
}

export interface DashboardReportersResponse {
  reporters: Connection<Reporter>;
}

export interface DashboardLatestBlockResponse {
  blocks: Connection<Block>;
}

// ============================================================================
// PARAMETER RESPONSE TYPES
// ============================================================================

export interface AllParametersResponse {
  disputeParams: Connection<DisputeParam>;
  distributionParams: Connection<DistributionParam>;
  govParams: Connection<GovParam>;
  oracleParams: Connection<OracleParam>;
  registryParams: Connection<RegistryParam>;
  reporterParams: Connection<ReporterParam>;
  slashingParams: Connection<SlashingParam>;
  stakingParams: Connection<StakingParam>;
}

// ============================================================================
// QUERY VARIABLE TYPES
// ============================================================================

export interface PaginationVariables {
  first?: number;
  after?: string; // This is actually a Cursor type in GraphQL, but we represent it as string in TypeScript
}

export interface BlockVariables {
  blockHeight: string;
}

export interface ValidatorVariables {
  operatorAddress: string;
}

export interface DelegationVariables extends PaginationVariables {
  validatorAddressId: string;
}

export interface GovProposalVariables {
  proposalId: number;
}

export interface TransactionVariables {
  hash: string;
}

// ============================================================================
// UTILITY TYPES FOR COMPONENT USAGE
// ============================================================================

/**
 * Parsed validator description (after JSON parsing)
 */
export interface ParsedValidatorDescription {
  details: string;
  moniker: string;
  website: string;
  identity: string;
  securityContact?: string;
}

/**
 * Parsed commission rates (after JSON parsing)
 */
export interface ParsedCommissionRates {
  rate: string;
  maxRate: string;
  maxChangeRate: string;
}

/**
 * Parsed commission (after JSON parsing)
 */
export interface ParsedCommission {
  updateTime: string;
  commissionRates: ParsedCommissionRates;
}

/**
 * Parsed governance proposal messages (after string parsing)
 */
export interface ParsedProposalMessages {
  messageTypes: string[];
}

/**
 * Hex string representation of byte data
 */
export interface HexString {
  hex: string;
}

/**
 * Parsed transaction data (after decoding)
 */
export interface ParsedTransactionData {
  messages: any[]; // Decoded transaction messages
  memo?: string;
}

// ============================================================================
// AGGREGATE REPORT TYPES
// ============================================================================

/**
 * Aggregate Report from GraphQL indexer
 * Represents an aggregated oracle report from the Tellor Layer blockchain
 */
export interface AggregateReport {
  nodeId: string;
  id: string;
  queryId: string;
  value: string; // Hex-encoded value
  queryData?: string; // Query data string
  blockHeight: string; // BigFloat as string
  timestamp: string; // Datetime as ISO string
  microReportHeight: string; // BigFloat as string
  totalReporters: number;
  totalPower: string; // BigFloat as string
  cyclist: boolean; // Note: GraphQL uses "cyclist" not "cycleList"
  aggregatePower?: string; // BigFloat as string
  flagged?: boolean;
}

export interface AggregateReportsResponse {
  aggregateReports: Connection<AggregateReport>;
}

export interface AggregateReportResponse {
  aggregateReport: AggregateReport | null;
}

// ============================================================================
// BRIDGE DEPOSIT TYPES
// ============================================================================

/**
 * Bridge deposit from GraphQL indexer
 * Represents a bridge deposit from Ethereum to Tellor Layer
 */
export interface BridgeDeposit {
  id: string;
  depositId: number;
  blockHeight: string | null; // BigFloat as string, can be null
  timestamp: string; // BigFloat as string (Unix timestamp)
  sender: string; // Ethereum address (0x...)
  recipient: string; // Cosmos address (tellor...)
  amount: string; // BigFloat as string (in wei)
  tip: string; // BigFloat as string (in wei)
  reported: boolean;
  claimed: boolean;
}

export interface BridgeDepositsResponse {
  bridgeDeposits: Connection<BridgeDeposit>;
}

export interface BridgeDepositResponse {
  bridgeDeposits: Connection<BridgeDeposit>;
}

// ============================================================================
// BRIDGE WITHDRAWAL TYPES
// ============================================================================

/**
 * Withdrawal from GraphQL indexer
 * Represents a bridge withdrawal from Tellor Layer to Ethereum
 * 
 * Note: Withdrawals are independent from deposits - they are separate processes.
 * The `depositId` field is the withdrawal's own ID (not a reference to a deposit).
 * Both deposits and withdrawals use the same smart contract on Ethereum but are unrelated.
 */
export interface Withdraw {
  id: string;
  depositId: number; // This is the withdrawal's own ID, not a reference to a deposit
  blockHeight: string; // BigFloat as string
  sender: string; // Cosmos address (tellor...)
  recipient: string; // Ethereum address (0x...)
  amount: string; // BigFloat as string
  claimed?: boolean | null;
  withdrawalInitiatedHeight?: string | null; // BigFloat as string
  withdrawalInitiatedTimestamp?: string | null; // Datetime as ISO string
  claimedTimestamp?: string | null; // Datetime as ISO string
}

export interface WithdrawalsResponse {
  withdraws: Connection<Withdraw>;
}

export interface WithdrawalResponse {
  withdraws: Connection<Withdraw>;
}

export interface BlockTimestampResponse {
  block: {
    blockHeight: string;
    blockTime: string; // ISO timestamp
  } | null;
}
