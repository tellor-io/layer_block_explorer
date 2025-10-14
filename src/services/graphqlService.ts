import { gql } from '@apollo/client'
import { graphqlClientManager } from '../utils/graphqlClient'
import { rpcManager } from '../utils/rpcManager'
import { Tendermint37Client } from '@cosmjs/tendermint-rpc'
import { StargateClient } from '@cosmjs/stargate'

// Import GraphQL queries
import {
  GET_LATEST_BLOCK,
  GET_BLOCK_BY_HEIGHT,
  GET_BLOCKS,
  GET_BLOCK_BY_HASH,
} from '../graphql/queries/blocks'
import {
  GET_TRANSACTIONS,
  GET_TRANSACTION_BY_HASH,
} from '../graphql/queries/transactions'
import {
  GET_VALIDATORS,
  GET_VALIDATOR_BY_ADDRESS,
} from '../graphql/queries/validators'
import {
  GET_REPORTERS,
  GET_REPORTER_BY_ADDRESS,
} from '../graphql/queries/reporters'
import {
  GET_BRIDGE_DEPOSITS,
  GET_BRIDGE_DEPOSIT_BY_ID,
} from '../graphql/queries/bridge'
import {
  GET_AGGREGATE_REPORTS,
  GET_ORACLE_DATA_BY_QUERY_ID,
} from '../graphql/queries/oracle'

// Types for GraphQL responses
export interface GraphQLBlock {
  id: string
  blockHeight: string
  blockHash: string
  blockTime: string
  appHash: string
  chainId: string
  consensusHash: string
  dataHash: string
  evidenceHash: string
  nextValidatorsHash: string
  validatorsHash: string
  proposerAddress: string
  numberOfTx: number
  voteExtensions?: string
}

export interface GraphQLTransaction {
  id: string
  txData: string
  blockHeight: string
  timestamp: string
}

export interface GraphQLValidator {
  id: string
  operatorAddress: string
  consensusPubkey: string
  consensusAddress: string
  delegatorAddress: string
  jailed: boolean
  bondStatus: string
  tokens: string
  delegatorShares: string
  description: {
    moniker: string
    identity: string
    website: string
    securityContact: string
    details: string
  }
  unbondingHeight: string
  unbondingTime: string
  commission: {
    commissionRates: {
      rate: string
      maxRate: string
      maxChangeRate: string
    }
    updateTime: string
  }
  minSelfDelegation: string
  unbondingOnHoldRefCount?: string
  unbondingIds?: string[]
  missedBlocks: number
}

export interface GraphQLReporter {
  id: string
  creationHeight: string
  commissionRate: string
  LastUpdated: string
  minTokensRequired: string
  moniker: string
  jailed: boolean
  jailedUntil: string
}

export interface GraphQLBridgeDeposit {
  id: string
  depositId: number
  blockHeight?: string
  timestamp: string
  sender: string
  recipient: string
  amount: string
  tip: string
  reported: boolean
  claimed: boolean
}

export interface GraphQLAggregateReport {
  id: string
  queryId: string
  queryData: string
  value: string
  aggregatePower: string
  microReportHeight: string
  blockHeight: string
  timestamp: string
  flagged: boolean
  totalReporters: number
  totalPower: string
  cyclist: boolean
}

// RPC fallback types
export interface RPCBlockResponse {
  result: {
    block: {
      header: {
        height: string
        app_hash: string
        chain_id: string
        consensus_hash: string
        data_hash: string
        evidence_hash: string
        next_validators_hash: string
        validators_hash: string
        proposer_address: string
        time: string
      }
      data: {
        txs: string[]
      }
    }
    block_id: {
      hash: string
    }
  }
}

export interface SwaggerValidatorResponse {
  validators: Array<{
    address: string
    voting_power: string
    pub_key: {
      value: string
    }
    jailed: boolean
    status: string
  }>
}

export interface SwaggerReporterResponse {
  reporters: Array<{
    address: string
    creation_height: string
    commission_rate: string
    last_updated: string
    min_tokens_required: string
    moniker: string
    jailed: boolean
    jailed_until: string
  }>
}

/**
 * GraphQL Service Layer that provides methods for each data type
 * with automatic fallback to RPC when GraphQL fails
 */
export class GraphQLService {
  /**
   * Get Apollo Client for GraphQL operations
   */
  private static async getClient() {
    return await graphqlClientManager.getOrCreateClient()
  }

  /**
   * Generic GraphQL query executor with error handling
   */
  private static async executeQuery<T>(
    query: any,
    variables?: any,
    fallbackFn?: () => Promise<T>
  ): Promise<T> {
    try {
      const client = await this.getClient()
      const result = await client.query({
        query,
        variables,
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      })

      if (result.error) {
        console.warn('GraphQL query returned error:', result.error)
        throw new Error(`GraphQL error: ${result.error.message}`)
      }

      return result.data as T
    } catch (error) {
      console.warn('GraphQL query failed, attempting fallback:', error)
      
      if (fallbackFn) {
        try {
          return await fallbackFn()
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError)
          throw new Error(`Both GraphQL and fallback failed. GraphQL: ${error}, Fallback: ${fallbackError}`)
        }
      }
      
      throw error
    }
  }

  // ============================================================================
  // BLOCK METHODS
  // ============================================================================

  /**
   * Get latest block with RPC fallback
   */
  public static async getLatestBlock(): Promise<GraphQLBlock> {
    return this.executeQuery(
      GET_LATEST_BLOCK,
      undefined,
      this.getLatestBlockRPC
    )
  }

  /**
   * Get block by height with RPC fallback
   */
  public static async getBlockByHeight(height: number): Promise<GraphQLBlock> {
    return this.executeQuery(
      GET_BLOCK_BY_HEIGHT,
      { height: height.toString() },
      () => this.getBlockByHeightRPC(height)
    )
  }

  /**
   * Get blocks with pagination and RPC fallback
   */
  public static async getBlocks(
    limit: number = 20,
    offset: number = 0
  ): Promise<GraphQLBlock[]> {
    return this.executeQuery(
      GET_BLOCKS,
      { limit, offset },
      () => this.getBlocksRPC(limit, offset)
    )
  }

  /**
   * Get block by hash with RPC fallback
   */
  public static async getBlockByHash(hash: string): Promise<GraphQLBlock> {
    return this.executeQuery(
      GET_BLOCK_BY_HASH,
      { hash },
      () => this.getBlockByHashRPC(hash)
    )
  }

  // ============================================================================
  // TRANSACTION METHODS
  // ============================================================================

  /**
   * Get transaction by hash with RPC fallback
   */
  public static async getTransactionByHash(hash: string): Promise<GraphQLTransaction> {
    return this.executeQuery(
      GET_TRANSACTION_BY_HASH,
      { hash },
      () => this.getTransactionByHashRPC(hash)
    )
  }

  /**
   * Get transactions with pagination and RPC fallback
   */
  public static async getTransactions(
    limit: number = 20,
    offset: number = 0
  ): Promise<GraphQLTransaction[]> {
    return this.executeQuery(
      GET_TRANSACTIONS,
      { limit, offset },
      () => this.getTransactionsRPC(limit, offset)
    )
  }

  // ============================================================================
  // VALIDATOR METHODS
  // ============================================================================

  /**
   * Get all validators with Swagger API fallback
   */
  public static async getValidators(): Promise<GraphQLValidator[]> {
    return this.executeQuery(
      GET_VALIDATORS,
      undefined,
      this.getValidatorsSwagger
    )
  }

  /**
   * Get validator by address with Swagger API fallback
   */
  public static async getValidatorByAddress(address: string): Promise<GraphQLValidator> {
    return this.executeQuery(
      GET_VALIDATOR_BY_ADDRESS,
      { address },
      () => this.getValidatorByAddressSwagger(address)
    )
  }

  // ============================================================================
  // REPORTER METHODS
  // ============================================================================

  /**
   * Get all reporters with Swagger API fallback
   */
  public static async getReporters(): Promise<GraphQLReporter[]> {
    return this.executeQuery(
      GET_REPORTERS,
      undefined,
      this.getReportersSwagger
    )
  }

  /**
   * Get reporter by address with Swagger API fallback
   */
  public static async getReporterByAddress(address: string): Promise<GraphQLReporter> {
    return this.executeQuery(
      GET_REPORTER_BY_ADDRESS,
      { address },
      () => this.getReporterByAddressSwagger(address)
    )
  }

  // ============================================================================
  // BRIDGE METHODS
  // ============================================================================

  /**
   * Get bridge deposits (GraphQL only - no fallback available)
   */
  public static async getBridgeDeposits(): Promise<GraphQLBridgeDeposit[]> {
    return this.executeQuery(GET_BRIDGE_DEPOSITS)
  }

  /**
   * Get bridge deposit by ID (GraphQL only - no fallback available)
   */
  public static async getBridgeDepositById(depositId: number): Promise<GraphQLBridgeDeposit> {
    return this.executeQuery(
      GET_BRIDGE_DEPOSIT_BY_ID,
      { depositId }
    )
  }

  // ============================================================================
  // ORACLE METHODS
  // ============================================================================

  /**
   * Get aggregate reports (GraphQL only - no fallback available)
   */
  public static async getAggregateReports(queryId?: string): Promise<GraphQLAggregateReport[]> {
    return this.executeQuery(
      GET_AGGREGATE_REPORTS,
      queryId ? { queryId } : undefined
    )
  }

  /**
   * Get oracle data (GraphQL only - no fallback available)
   */
  public static async getOracleData(queryId: string): Promise<any> {
    return this.executeQuery(
      GET_ORACLE_DATA_BY_QUERY_ID,
      { queryId }
    )
  }

  // ============================================================================
  // RPC FALLBACK METHODS
  // ============================================================================

  /**
   * RPC fallback for latest block
   */
  private static async getLatestBlockRPC(): Promise<GraphQLBlock> {
    const endpoint = await rpcManager.getCurrentEndpoint()
    const tmClient = await Tendermint37Client.connect(endpoint)
    const client = await StargateClient.create(tmClient)
    
    const block = await client.getBlock()
    
    return {
      id: block.header.height.toString(),
      blockHeight: block.header.height.toString(),
      blockHash: block.id, // block.id is the hash string directly
      blockTime: block.header.time.toString(), // time is a string, not a Date
      appHash: '', // appHash not available in this version
      chainId: block.header.chainId,
      consensusHash: '',
      dataHash: '',
      evidenceHash: '',
      nextValidatorsHash: '',
      validatorsHash: '',
      proposerAddress: '',
      numberOfTx: block.txs.length,
      voteExtensions: undefined,
    }
  }

  /**
   * RPC fallback for block by height
   */
  private static async getBlockByHeightRPC(height: number): Promise<GraphQLBlock> {
    const endpoint = await rpcManager.getCurrentEndpoint()
    const tmClient = await Tendermint37Client.connect(endpoint)
    const client = await StargateClient.create(tmClient)
    
    const block = await client.getBlock(height)
    
    return {
      id: block.header.height.toString(),
      blockHeight: block.header.height.toString(),
      blockHash: block.id, // block.id is the hash string directly
      blockTime: block.header.time.toString(), // time is a string, not a Date
      appHash: '', // appHash not available in this version
      chainId: block.header.chainId,
      consensusHash: '',
      dataHash: '',
      evidenceHash: '',
      nextValidatorsHash: '',
      validatorsHash: '',
      proposerAddress: '',
      numberOfTx: block.txs.length,
      voteExtensions: undefined,
    }
  }

  /**
   * RPC fallback for blocks with pagination
   */
  private static async getBlocksRPC(limit: number, offset: number): Promise<GraphQLBlock[]> {
    const latestBlock = await this.getLatestBlockRPC()
    const blocks: GraphQLBlock[] = []

    for (let i = 0; i < limit; i++) {
      const height = parseInt(latestBlock.blockHeight) - offset - i
      if (height >= 0) {
        try {
          const block = await this.getBlockByHeightRPC(height)
          blocks.push(block)
        } catch (error) {
          console.warn(`Failed to fetch block ${height}:`, error)
          break
        }
      }
    }

    return blocks
  }

  /**
   * RPC fallback for block by hash
   */
  private static async getBlockByHashRPC(hash: string): Promise<GraphQLBlock> {
    // RPC doesn't support direct hash lookup, so we need to find it by searching
    // This is a simplified implementation - in practice, you might want to implement
    // a more sophisticated search mechanism
    const latestBlock = await this.getLatestBlockRPC()
    const maxSearchHeight = parseInt(latestBlock.blockHeight)
    
    for (let height = maxSearchHeight; height >= Math.max(0, maxSearchHeight - 1000); height--) {
      try {
        const block = await this.getBlockByHeightRPC(height)
        if (block.blockHash === hash) {
          return block
        }
      } catch (error) {
        continue
      }
    }
    
    throw new Error(`Block with hash ${hash} not found in recent blocks`)
  }

  /**
   * RPC fallback for transaction by hash
   */
  private static async getTransactionByHashRPC(hash: string): Promise<GraphQLTransaction> {
    const endpoint = await rpcManager.getCurrentEndpoint()
    const tmClient = await Tendermint37Client.connect(endpoint)
    
    // Convert string hash to Uint8Array for the RPC call
    const hashBytes = new TextEncoder().encode(hash)
    const tx = await tmClient.tx({ hash: hashBytes })
    
    if (!tx.result) {
      throw new Error(`Transaction ${hash} not found`)
    }
    
    return {
      id: hash,
      txData: tx.tx ? Buffer.from(tx.tx).toString('base64') : '', // tx.tx contains the transaction data
      blockHeight: tx.height.toString(), // tx.height contains the block height
      timestamp: new Date().toISOString(), // RPC doesn't provide timestamp directly
    }
  }

  /**
   * RPC fallback for transactions with pagination
   */
  private static async getTransactionsRPC(limit: number, offset: number): Promise<GraphQLTransaction[]> {
    // RPC doesn't have direct transaction pagination, so we need to fetch blocks and extract transactions
    const blocks = await this.getBlocksRPC(limit, offset)
    const transactions: GraphQLTransaction[] = []

    for (const block of blocks) {
      // For now, return empty array as extracting transactions from blocks requires additional RPC calls
      // This could be implemented by fetching transaction details for each block
    }

    return transactions
  }

  // ============================================================================
  // SWAGGER API FALLBACK METHODS
  // ============================================================================

  /**
   * Swagger API fallback for validators
   */
  private static async getValidatorsSwagger(): Promise<GraphQLValidator[]> {
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')
    
    const response = await fetch(`${baseEndpoint}/cosmos/staking/v1beta1/validators`)
    
    if (!response.ok) {
      throw new Error(`Swagger API request failed: ${response.status}`)
    }
    
    const data: SwaggerValidatorResponse = await response.json()
    
    return data.validators.map((validator) => ({
      id: validator.address,
      operatorAddress: validator.address,
      consensusPubkey: validator.pub_key?.value || '',
      consensusAddress: validator.address,
      delegatorAddress: validator.address,
      jailed: validator.jailed,
      bondStatus: validator.status || 'BOND_STATUS_BONDED',
      tokens: validator.voting_power || '0',
      delegatorShares: validator.voting_power || '0',
      description: {
        moniker: validator.pub_key?.value || '',
        identity: '',
        website: '',
        securityContact: '',
        details: '',
      },
      unbondingHeight: '0',
      unbondingTime: '0',
      commission: {
        commissionRates: {
          rate: '0',
          maxRate: '0',
          maxChangeRate: '0',
        },
        updateTime: new Date().toISOString(),
      },
      minSelfDelegation: '0',
      unbondingOnHoldRefCount: undefined,
      unbondingIds: undefined,
      missedBlocks: 0,
    }))
  }

  /**
   * Swagger API fallback for validator by address
   */
  private static async getValidatorByAddressSwagger(address: string): Promise<GraphQLValidator> {
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')
    
    const response = await fetch(`${baseEndpoint}/cosmos/staking/v1beta1/validators/${address}`)
    
    if (!response.ok) {
      throw new Error(`Swagger API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    const validator = data.validator
    
    return {
      id: validator.address,
      operatorAddress: validator.address,
      consensusPubkey: validator.pub_key?.value || '',
      consensusAddress: validator.address,
      delegatorAddress: validator.address,
      jailed: validator.jailed,
      bondStatus: validator.status || 'BOND_STATUS_BONDED',
      tokens: validator.voting_power || '0',
      delegatorShares: validator.voting_power || '0',
      description: {
        moniker: validator.pub_key?.value || '',
        identity: '',
        website: '',
        securityContact: '',
        details: '',
      },
      unbondingHeight: '0',
      unbondingTime: '0',
      commission: {
        commissionRates: {
          rate: '0',
          maxRate: '0',
          maxChangeRate: '0',
        },
        updateTime: new Date().toISOString(),
      },
      minSelfDelegation: '0',
      unbondingOnHoldRefCount: undefined,
      unbondingIds: undefined,
      missedBlocks: 0,
    }
  }

  /**
   * Swagger API fallback for reporters
   */
  private static async getReportersSwagger(): Promise<GraphQLReporter[]> {
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')
    
    const response = await fetch(`${baseEndpoint}/tellor-io/layer/reporter/reporters`)
    
    if (!response.ok) {
      throw new Error(`Swagger API request failed: ${response.status}`)
    }
    
    const data: SwaggerReporterResponse = await response.json()
    
    return data.reporters.map((reporter) => ({
      id: reporter.address,
      creationHeight: reporter.creation_height,
      commissionRate: reporter.commission_rate,
      LastUpdated: reporter.last_updated,
      minTokensRequired: reporter.min_tokens_required,
      moniker: reporter.moniker,
      jailed: reporter.jailed,
      jailedUntil: reporter.jailed_until,
    }))
  }

  /**
   * Swagger API fallback for reporter by address
   */
  private static async getReporterByAddressSwagger(address: string): Promise<GraphQLReporter> {
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')
    
    const response = await fetch(`${baseEndpoint}/tellor-io/layer/reporter/reporters/${address}`)
    
    if (!response.ok) {
      throw new Error(`Swagger API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    const reporter = data.reporter
    
    return {
      id: reporter.address,
      creationHeight: reporter.creation_height,
      commissionRate: reporter.commission_rate,
      LastUpdated: reporter.last_updated,
      minTokensRequired: reporter.min_tokens_required,
      moniker: reporter.moniker,
      jailed: reporter.jailed,
      jailedUntil: reporter.jailed_until,
    }
  }
}

// Export convenience functions for easy access
export const getLatestBlock = () => GraphQLService.getLatestBlock()
export const getBlockByHeight = (height: number) => GraphQLService.getBlockByHeight(height)
export const getBlocks = (limit?: number, offset?: number) => GraphQLService.getBlocks(limit, offset)
export const getBlockByHash = (hash: string) => GraphQLService.getBlockByHash(hash)
export const getTransactionByHash = (hash: string) => GraphQLService.getTransactionByHash(hash)
export const getTransactions = (limit?: number, offset?: number) => GraphQLService.getTransactions(limit, offset)
export const getValidators = () => GraphQLService.getValidators()
export const getValidatorByAddress = (address: string) => GraphQLService.getValidatorByAddress(address)
export const getReporters = () => GraphQLService.getReporters()
export const getReporterByAddress = (address: string) => GraphQLService.getReporterByAddress(address)
export const getBridgeDeposits = () => GraphQLService.getBridgeDeposits()
export const getBridgeDepositById = (depositId: number) => GraphQLService.getBridgeDepositById(depositId)
export const getAggregateReports = (queryId?: string) => GraphQLService.getAggregateReports(queryId)
export const getOracleData = (queryId: string) => GraphQLService.getOracleData(queryId)
