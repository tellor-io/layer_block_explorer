/**
 * GraphQL Type Definitions for Layer Block Explorer
 * 
 * This file contains TypeScript interfaces that match the GraphQL schema
 * used by the indexer. These types ensure type safety when working with
 * GraphQL queries and responses.
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

/** Pagination parameters for queries */
export interface Pagination {
  limit: number;
  offset: number;
  cursor?: string;
}

/** Sorting options for queries */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

/** Filter options for queries */
export interface FilterOptions {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

/** Generic GraphQL response wrapper */
export interface GraphQLResponse<T> {
  data: T;
  errors?: GraphQLError[];
}

/** GraphQL error type */
export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: string[];
  extensions?: Record<string, any>;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageInfo: {
    startCursor?: string;
    endCursor?: string;
  };
}

// ============================================================================
// BLOCK TYPES
// ============================================================================

/** Block header information */
export interface BlockHeader {
  height: number;
  hash: string;
  parentHash: string;
  timestamp: string;
  proposer: string;
  chainId: string;
  appHash: string;
  consensusHash: string;
  dataHash: string;
  evidenceHash: string;
  lastBlockId: {
    hash: string;
    parts: {
      total: number;
      hash: string;
    };
  };
  lastCommitHash: string;
  nextValidatorsHash: string;
  validatorsHash: string;
  version: {
    block: string;
    app: string;
  };
}

/** Block data content */
export interface BlockData {
  txs: string[];
  evidence: any[];
  lastCommit: {
    height: number;
    round: number;
    blockId: {
      hash: string;
      parts: {
        total: number;
        hash: string;
      };
    };
    signatures: Array<{
      blockIdFlag: number;
      validatorAddress: string;
      timestamp: string;
      signature: string;
    }>;
  };
}

/** Complete block information */
export interface Block {
  header: BlockHeader;
  data: BlockData;
  evidence: any[];
  lastCommit: any;
  size: number;
  numTxs: number;
  totalTxs: number;
  gasUsed: number;
  gasWanted: number;
  voteExtensions?: string; // JSON string containing vote extension data
}

/** GraphQL Block response structure */
export interface GraphQLBlock {
  blockHeight: string;
  id: string;
  blockTime: string;
  blockHash: string;
  proposerAddress: string;
  numberOfTx: number;
  voteExtensions: string; // JSON string containing VoteExtensionData
  finalizedEvents: {
    nodes: Array<{
      id: string;
      events: string[]; // JSON strings of events
    }>;
  };
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

/** Transaction event information */
export interface TxEvent {
  type: string;
  attributes: Array<{
    key: string;
    value: string;
    index: boolean;
  }>;
}

/** Transaction result */
export interface TxResult {
  code: number;
  data: string;
  log: string;
  info: string;
  gasWanted: number;
  gasUsed: number;
  events: TxEvent[];
  codespace: string;
}

/** Transaction information */
export interface Tx {
  hash: string;
  height: number;
  index: number;
  tx: string;
  result: TxResult;
  timestamp: string;
  fee: {
    amount: Array<{
      denom: string;
      amount: string;
    }>;
    gas: string;
  };
  memo: string;
  signatures: Array<{
    pubKey: {
      type: string;
      value: string;
    };
    signature: string;
  }>;
}

// ============================================================================
// VALIDATOR TYPES
// ============================================================================

/** Validator power/stake information */
export interface ValidatorPower {
  address: string;
  power: string;
  votingPower: number;
  rank: number;
  percentage: number;
}

/** Delegation information */
export interface Delegation {
  delegatorAddress: string;
  validatorAddress: string;
  amount: {
    denom: string;
    amount: string;
  };
  shares: string;
  height: number;
}

/** Validator information */
export interface Validator {
  address: string;
  pubKey: {
    type: string;
    value: string;
  };
  votingPower: number;
  proposerPriority: number;
  commission: {
    rate: string;
    maxRate: string;
    maxChangeRate: string;
  };
  description: {
    moniker: string;
    identity: string;
    website: string;
    securityContact: string;
    details: string;
  };
  status: string;
  jailed: boolean;
  unbondingHeight: number;
  unbondingTime: string;
  minSelfDelegation: string;
  delegations: Delegation[];
  totalDelegations: string;
  selfDelegation: string;
}

// ============================================================================
// REPORTER TYPES
// ============================================================================

/** Report status information */
export interface ReportStatus {
  status: string;
  timestamp: string;
  blockHeight: number;
  txHash: string;
}

/** Reporter selector data */
export interface ReporterSelector {
  queryId: string;
  reporter: string;
  timestamp: string;
  value: string;
  nonce: number;
  blockHeight: number;
  txHash: string;
}

/** Reporter information */
export interface Reporter {
  address: string;
  stake: string;
  lockedStake: string;
  availableStake: string;
  totalReports: number;
  totalValue: string;
  lastReportTime: string;
  isActive: boolean;
  selectors: ReporterSelector[];
  reports: Array<{
    queryId: string;
    timestamp: string;
    value: string;
    blockHeight: number;
    txHash: string;
  }>;
}

// ============================================================================
// BRIDGE TYPES
// ============================================================================

/** Bridge attestation data */
export interface Attestation {
  id: string;
  queryId: string;
  timestamp: string;
  value: string;
  nonce: number;
  blockHeight: number;
  txHash: string;
  status: string;
}

/** Bridge withdrawal data */
export interface Withdrawal {
  id: string;
  user: string;
  amount: string;
  timestamp: string;
  blockHeight: number;
  txHash: string;
  status: string;
  ethereumTxHash?: string;
}

/** Bridge deposit data */
export interface Deposit {
  id: string;
  user: string;
  amount: string;
  timestamp: string;
  blockHeight: number;
  txHash: string;
  status: string;
  ethereumTxHash?: string;
  attestations: Attestation[];
}

// ============================================================================
// ORACLE TYPES
// ============================================================================

/** Query data information */
export interface QueryData {
  queryId: string;
  timestamp: string;
  value: string;
  nonce: number;
  blockHeight: number;
  txHash: string;
  reporter: string;
  status: string;
}

/** Oracle report data */
export interface OracleReport {
  queryId: string;
  timestamp: string;
  value: string;
  nonce: number;
  blockHeight: number;
  txHash: string;
  reporter: string;
  status: string;
  disputeStatus?: string;
  disputeTime?: string;
  disputeReporter?: string;
  disputeTxHash?: string;
}

// ============================================================================
// QUERY INPUT TYPES
// ============================================================================

/** Input for block queries */
export interface BlockQueryInput {
  height?: number;
  hash?: string;
  pagination?: Pagination;
  sortBy?: 'height' | 'timestamp';
  sortOrder?: SortOrder;
}

/** Input for transaction queries */
export interface TransactionQueryInput {
  hash?: string;
  height?: number;
  address?: string;
  pagination?: Pagination;
  sortBy?: 'height' | 'timestamp';
  sortOrder?: SortOrder;
}

/** Input for validator queries */
export interface ValidatorQueryInput {
  address?: string;
  status?: string;
  pagination?: Pagination;
  sortBy?: 'votingPower' | 'commission';
  sortOrder?: SortOrder;
}

/** Input for reporter queries */
export interface ReporterQueryInput {
  address?: string;
  queryId?: string;
  status?: string;
  pagination?: Pagination;
  sortBy?: 'stake' | 'totalReports';
  sortOrder?: SortOrder;
}

/** Input for bridge queries */
export interface BridgeQueryInput {
  queryId?: string;
  user?: string;
  type?: 'deposit' | 'withdrawal' | 'attestation';
  status?: string;
  pagination?: Pagination;
  sortBy?: 'timestamp' | 'amount';
  sortOrder?: SortOrder;
}

/** Input for oracle queries */
export interface OracleQueryInput {
  queryId?: string;
  timestamp?: string;
  reporter?: string;
  status?: string;
  pagination?: Pagination;
  sortBy?: 'timestamp' | 'value';
  sortOrder?: SortOrder;
}

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

/** Real-time block subscription */
export interface BlockSubscription {
  newBlock: Block;
}

/** Real-time transaction subscription */
export interface TransactionSubscription {
  newTransaction: Tx;
}

/** Real-time validator subscription */
export interface ValidatorSubscription {
  validatorUpdate: Validator;
}

/** Real-time reporter subscription */
export interface ReporterSubscription {
  reporterUpdate: Reporter;
}

// ============================================================================
// VOTE EXTENSION TYPES
// ============================================================================

/** Vote extension data structure */
export interface VoteExtensionData {
  block_height: number;
  op_and_evm_addrs: {
    operator_addresses: string[];
    evm_addresses: string[];
  };
  valset_sigs: {
    operator_addresses: string[] | null;
    timestamps: string[] | null;
    signatures: string[] | null;
  };
  oracle_attestations: {
    operator_addresses: string[];
    attestations: string[];
    snapshots: string[];
  };
  extended_commit_info: {
    votes: Array<{
      validator: {
        address: string;
        power: number;
      };
      vote_extension: string;
      extension_signature: string;
      block_id_flag: number;
    }>;
  };
}

/** Vote extension data */
export interface VoteExtension {
  id: string;
  height: number;
  round: number;
  validatorAddress: string;
  extension: VoteExtensionData;
  timestamp: string;
  blockHash: string;
  txHash: string;
  status: string;
}

/** Vote extension query input */
export interface VoteExtensionQueryInput {
  height?: number;
  round?: number;
  validatorAddress?: string;
  type?: string;
  pagination?: Pagination;
  sortBy?: 'height' | 'round' | 'timestamp';
  sortOrder?: SortOrder;
}

/** Vote extension subscription */
export interface VoteExtensionSubscription {
  newVoteExtension: VoteExtension;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Generic query result with pagination */
export type QueryResult<T> = PaginatedResponse<T>;

/** Generic subscription result */
export type SubscriptionResult<T> = GraphQLResponse<T>;

/** Union type for all data entities */
export type DataEntity = Block | Tx | Validator | Reporter | Deposit | Withdrawal | Attestation | OracleReport | VoteExtension;

/** Union type for all query inputs */
export type QueryInput = BlockQueryInput | TransactionQueryInput | ValidatorQueryInput | ReporterQueryInput | BridgeQueryInput | OracleQueryInput | VoteExtensionQueryInput;
