// ============================================================================
// FRAGMENTS
// ============================================================================

export * from './fragments'

// ============================================================================
// BLOCK QUERIES
// ============================================================================

export * from './blocks'

// ============================================================================
// TRANSACTION QUERIES
// ============================================================================

export * from './transactions'

// ============================================================================
// VALIDATOR QUERIES
// ============================================================================

export * from './validators'

// ============================================================================
// REPORTER QUERIES
// ============================================================================

export * from './reporters'

// ============================================================================
// BRIDGE QUERIES
// ============================================================================

export * from './bridge'

// ============================================================================
// ORACLE QUERIES
// ============================================================================

export * from './oracle'

// ============================================================================
// QUERY GROUPS FOR EASY IMPORTING
// ============================================================================

// Import all queries for convenience
import * as BlockQueries from './blocks'
import * as TransactionQueries from './transactions'
import * as ValidatorQueries from './validators'
import * as ReporterQueries from './reporters'
import * as BridgeQueries from './bridge'
import * as OracleQueries from './oracle'

// Export query groups
export const Queries = {
  blocks: BlockQueries,
  transactions: TransactionQueries,
  validators: ValidatorQueries,
  reporters: ReporterQueries,
  bridge: BridgeQueries,
  oracle: OracleQueries,
}

// Export commonly used queries for quick access
export const CommonQueries = {
  // Block queries
  GET_LATEST_BLOCK: BlockQueries.GET_LATEST_BLOCK,
  GET_BLOCK_BY_HEIGHT: BlockQueries.GET_BLOCK_BY_HEIGHT,
  GET_BLOCKS: BlockQueries.GET_BLOCKS,

  // Transaction queries
  GET_TRANSACTION_BY_HASH: TransactionQueries.GET_TRANSACTION_BY_HASH,
  GET_TRANSACTIONS: TransactionQueries.GET_TRANSACTIONS,

  // Validator queries
  GET_VALIDATORS: ValidatorQueries.GET_VALIDATORS,
  GET_VALIDATOR_BY_ADDRESS: ValidatorQueries.GET_VALIDATOR_BY_ADDRESS,

  // Reporter queries
  GET_REPORTERS: ReporterQueries.GET_REPORTERS,
  GET_REPORTER_BY_ADDRESS: ReporterQueries.GET_REPORTER_BY_ADDRESS,

  // Bridge queries
  GET_BRIDGE_DEPOSITS: BridgeQueries.GET_BRIDGE_DEPOSITS,
  GET_WITHDRAWS: BridgeQueries.GET_WITHDRAWS,

  // Oracle queries
  GET_AGGREGATE_REPORTS: OracleQueries.GET_AGGREGATE_REPORTS,
  GET_MICRO_REPORTS: OracleQueries.GET_MICRO_REPORTS,
}
