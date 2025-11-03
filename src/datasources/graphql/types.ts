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
  title: string;
  status: 'proposal_deposit_period' | 'proposal_voting_period' | 'proposal_passed' | 'proposal_rejected' | 'proposal_failed' | 'proposal_dropped' | 'PROPOSAL_STATUS_VOTING_PERIOD';
  submitTime: string; // ISO timestamp
  votingStartTime: string; // ISO timestamp
  votingEndTime: string; // ISO timestamp
  messages: string; // Comma-separated message types
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

export interface GovParam {
  id: string;
  votingParams: string; // JSON string
  tallyParams: string; // JSON string
  depositParams: string; // JSON string
}

export interface OracleParam {
  id: string;
  maxDataPoints: string;
  maxValueLength: string;
  maxReporters: string;
  minValidReports: string;
  reportFrequency: string;
  reportExpiration: string;
}

export interface RegistryParam {
  id: string;
  stakeAmount: string;
  stakeToken: string;
  governanceToken: string;
  reporterAddress: string;
}

export interface ReporterParam {
  id: string;
  reporterStake: string;
  reporterPayout: string;
  reporterSlash: string;
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
