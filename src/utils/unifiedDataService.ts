import {
  DataSourceType,
  fetchWithFallback,
  FetchOptions,
  FetchResult,
} from './dataSourceManager'
import { graphqlClientManager } from './graphqlClient'
import { rpcManager } from './rpcManager'
import { gql } from '@apollo/client'

// Interfaces matching the GraphQL schema structure

// Core blockchain entities
export interface Block {
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

export interface Transaction {
  id: string
  txData: string
  blockHeight: string
  timestamp: string
}

export interface FinalizedEvents {
  id: string
  blockHeight: string
  events?: string[]
}

// Oracle entities
export interface MicroReport {
  id: string
  queryId: string
  queryIdHeight: string
  metaId: string
  height: string
  reporter: string
  power: string
  cycleList: boolean
}

export interface MetaIdAggregate {
  id: string
  totalPower: string
  reporterCount: number
}

export interface AggregateReport {
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

// Bridge entities
export interface BridgeDeposit {
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

export interface Withdraw {
  id: string
  depositId: number
  blockHeight: string
  sender: string
  recipient: string
  amount: string
}

// Staking entities
export interface CommissionRates {
  rate: string
  maxRate: string
  maxChangeRate: string
}

export interface Commission {
  commissionRates?: CommissionRates
  updateTime: string
}

export interface Description {
  moniker: string
  identity: string
  website: string
  securityContact: string
  details: string
}

export interface Validator {
  id: string
  operatorAddress: string
  consensusPubkey: string
  consensusAddress: string
  delegatorAddress: string
  jailed: boolean
  bondStatus: string
  tokens: string
  delegatorShares: string
  description: Description
  unbondingHeight: string
  unbondingTime: string
  commission: Commission
  minSelfDelegation: string
  unbondingOnHoldRefCount?: string
  unbondingIds?: string[]
  missedBlocks: number
  delegations?: Delegation[]
}

export interface Delegation {
  id: string
  delegatorAddress: string
  validatorAddress: Validator
  shares: string
}

// Reporter entities
export interface Reporter {
  id: string
  creationHeight: string
  commissionRate: string
  LastUpdated: string
  minTokensRequired: string
  moniker: string
  jailed: boolean
  jailedUntil: string
}

export interface Selector {
  id: string
  reporterAddress: string
  lockedUntilTime: string
}

// Governance entities
export interface Coin {
  denom?: string
  amount?: string
}

export interface WeightedVoteOption {
  VoteOption: number
  Weight: string
}

export interface GovProposal {
  id: string
  proposalId: number
  messages: string
  status: string
  submitTime: string
  depositEndTime?: string
  votingStartTime?: string
  votingEndTime?: string
  metaData: string
  title?: string
  summary: string
  proposer?: string
  expedited: boolean
  votes?: Vote[]
}

export interface Vote {
  id: string
  proposal: GovProposal
  option?: WeightedVoteOption[]
  metaData: string
}

export interface EvmAddress {
  id: string
  evmAddress: string
}

// Parameter entities
export interface StakingParams {
  id: string
  unbondingTime: string
  maxValidators: number
  maxEntries: number
  historicalEntries: number
  bondDenom: string
  minCommissionRate: string
}

export interface GovParams {
  id: string
  minDeposit: Coin[]
  maxDepositPeriod: string
  votingPeriod: string
  quorum: string
  threshold: string
  vetoThreshold: string
  minInitialDepositRatio: string
  proposalCancelRatio: string
  proposalCancelDest: string
  expeditedVotingPeriod: string
  expeditedThreshold: string
  expeditedMinDeposit: Coin[]
  burnVoteQuorum: boolean
  burnProposalDepositPrevote: boolean
  burnVoteVeto: boolean
  minDepositRatio: string
}

export interface DistributionParams {
  id: string
  communityTax: string
  baseProposerReward: string
  bonusProposerReward: string
  withdrawAddrEnabled: boolean
}

export interface SlashingParams {
  id: string
  signedBlocksWindow: string
  minSignedPerWindow: string
  downtimeJailDuration: string
  slashFractionDoubleSign: string
  slashFractionDowntime: string
}

export interface OracleParams {
  id: string
  minStakeAmount: string
  minTipAmount: string
  maxTipAmount: string
}

export interface RegistryParams {
  id: string
  maxReportBufferWindow: string
}

export interface DisputeParams {
  id: string
  teamAddress: string
}

export interface ReporterParams {
  id: string
  minCommissionRate: string
  minLoya: string
  maxSelectors: string
  maxNumOfDelegations: string
}

// Fallback API response types
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

export interface RPCTransactionResponse {
  result: {
    hash: string
    height: string
    timestamp: string
    tx: any
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
 * Unified Data Service that provides a single interface for fetching data
 * from GraphQL with custom fallback to RPC and Swagger APIs
 */
export class UnifiedDataService {
  /**
   * Generic RPC API call function
   */
  private static async callRPC<T>(path: string): Promise<T> {
    const endpoint = await rpcManager.getCurrentEndpoint()

    const response = await fetch(`${endpoint}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Generic Swagger API call function
   */
  private static async callSwaggerAPI<T>(path: string): Promise<T> {
    // TODO: Configure Swagger API base URL
    const swaggerBaseUrl =
      process.env.SWAGGER_API_URL || 'https://api.example.com'

    const response = await fetch(`${swaggerBaseUrl}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Swagger API request failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Fetch latest block with GraphQL primary and RPC fallback
   */
  public static async getLatestBlock(
    options?: FetchOptions
  ): Promise<FetchResult<Block>> {
    return fetchWithFallback(async (source: DataSourceType) => {
      if (source === DataSourceType.GRAPHQL) {
        return await this.fetchLatestBlockGraphQL()
      } else {
        return await this.fetchLatestBlockRPC()
      }
    }, options)
  }

  /**
   * Fetch block by height with GraphQL primary and RPC fallback
   */
  public static async getBlockByHeight(
    height: number,
    options?: FetchOptions
  ): Promise<FetchResult<Block>> {
    return fetchWithFallback(async (source: DataSourceType) => {
      if (source === DataSourceType.GRAPHQL) {
        return await this.fetchBlockByHeightGraphQL(height)
      } else {
        return await this.fetchBlockByHeightRPC(height)
      }
    }, options)
  }

  /**
   * Fetch blocks with pagination and GraphQL primary
   */
  public static async getBlocks(
    limit: number = 20,
    offset: number = 0,
    options?: FetchOptions
  ): Promise<FetchResult<Block[]>> {
    return fetchWithFallback(async (source: DataSourceType) => {
      if (source === DataSourceType.GRAPHQL) {
        return await this.fetchBlocksGraphQL(limit, offset)
      } else {
        return await this.fetchBlocksRPC(limit, offset)
      }
    }, options)
  }

  /**
   * Fetch transaction by hash with GraphQL primary and RPC fallback
   */
  public static async getTransactionByHash(
    hash: string,
    options?: FetchOptions
  ): Promise<FetchResult<Transaction>> {
    return fetchWithFallback(async (source: DataSourceType) => {
      if (source === DataSourceType.GRAPHQL) {
        return await this.fetchTransactionByHashGraphQL(hash)
      } else {
        return await this.fetchTransactionByHashRPC(hash)
      }
    }, options)
  }

  /**
   * Fetch transactions with pagination and GraphQL primary
   */
  public static async getTransactions(
    limit: number = 20,
    offset: number = 0,
    options?: FetchOptions
  ): Promise<FetchResult<Transaction[]>> {
    return fetchWithFallback(async (source: DataSourceType) => {
      if (source === DataSourceType.GRAPHQL) {
        return await this.fetchTransactionsGraphQL(limit, offset)
      } else {
        return await this.fetchTransactionsRPC(limit, offset)
      }
    }, options)
  }

  /**
   * Fetch validators with GraphQL primary and Swagger API fallback
   */
  public static async getValidators(
    options?: FetchOptions
  ): Promise<FetchResult<Validator[]>> {
    return fetchWithFallback(async (source: DataSourceType) => {
      if (source === DataSourceType.GRAPHQL) {
        return await this.fetchValidatorsGraphQL()
      } else {
        return await this.fetchValidatorsSwagger()
      }
    }, options)
  }

  /**
   * Fetch reporters with GraphQL primary and Swagger API fallback
   */
  public static async getReporters(
    options?: FetchOptions
  ): Promise<FetchResult<Reporter[]>> {
    return fetchWithFallback(async (source: DataSourceType) => {
      if (source === DataSourceType.GRAPHQL) {
        return await this.fetchReportersGraphQL()
      } else {
        return await this.fetchReportersSwagger()
      }
    }, options)
  }

  /**
   * Fetch aggregate reports with GraphQL primary and RPC/Swagger fallback options
   */
  public static async getAggregateReports(
    queryId?: string,
    options?: FetchOptions
  ): Promise<FetchResult<AggregateReport[]>> {
    return fetchWithFallback(async (source: DataSourceType) => {
      if (source === DataSourceType.GRAPHQL) {
        return await this.fetchAggregateReportsGraphQL(queryId)
      } else {
        // TODO: Choose which fallback to implement
        // Option 1: RPC fallback (if oracle data available via RPC)
        // return await this.fetchAggregateReportsRPC(queryId)

        // Option 2: Swagger API fallback (if oracle data available via Swagger)
        // return await this.fetchAggregateReportsSwagger(queryId)

        throw new Error('Aggregate reports only available via GraphQL')
      }
    }, options)
  }

  /**
   * Fetch bridge deposits with GraphQL primary and RPC/Swagger fallback options
   */
  public static async getBridgeDeposits(
    options?: FetchOptions
  ): Promise<FetchResult<BridgeDeposit[]>> {
    return fetchWithFallback(async (source: DataSourceType) => {
      if (source === DataSourceType.GRAPHQL) {
        return await this.fetchBridgeDepositsGraphQL()
      } else {
        // TODO: Choose which fallback to implement
        // Option 1: RPC fallback (if bridge data available via RPC)
        // return await this.fetchBridgeDepositsRPC()

        // Option 2: Swagger API fallback (if bridge data available via Swagger)
        // return await this.fetchBridgeDepositsSwagger()

        throw new Error('Bridge deposits only available via GraphQL')
      }
    }, options)
  }

  /**
   * Fetch governance proposals with GraphQL primary and RPC/Swagger fallback options
   */
  public static async getGovProposals(
    options?: FetchOptions
  ): Promise<FetchResult<GovProposal[]>> {
    return fetchWithFallback(async (source: DataSourceType) => {
      if (source === DataSourceType.GRAPHQL) {
        return await this.fetchGovProposalsGraphQL()
      } else {
        // TODO: Choose which fallback to implement
        // Option 1: RPC fallback (if governance data available via RPC)
        // return await this.fetchGovProposalsRPC()

        // Option 2: Swagger API fallback (if governance data available via Swagger)
        // return await this.fetchGovProposalsSwagger()

        throw new Error('Governance proposals only available via GraphQL')
      }
    }, options)
  }

  // GraphQL Implementation Methods
  private static async fetchLatestBlockGraphQL(): Promise<Block> {
    const client = await graphqlClientManager.getOrCreateClient()

    const query = gql`
      query GetLatestBlock {
        blocks(first: 1, orderBy: blockHeight, orderDirection: desc) {
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

    const result = await client.query({
      query: query,
      fetchPolicy: 'network-only',
    })

    // Placeholder return - replace with actual data transformation
    return {
      id: '0',
      blockHeight: '0',
      blockHash: '',
      blockTime: new Date().toISOString(),
      appHash: '',
      chainId: '',
      consensusHash: '',
      dataHash: '',
      evidenceHash: '',
      nextValidatorsHash: '',
      validatorsHash: '',
      proposerAddress: '',
      numberOfTx: 0,
      voteExtensions: undefined,
    }
  }

  private static async fetchBlockByHeightGraphQL(
    height: number
  ): Promise<Block> {
    const client = await graphqlClientManager.getOrCreateClient()

    const query = gql`
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

    const result = await client.query({
      query: query,
      variables: { height: height.toString() },
      fetchPolicy: 'network-only',
    })

    // Placeholder return - replace with actual data transformation
    return {
      id: height.toString(),
      blockHeight: height.toString(),
      blockHash: '',
      blockTime: new Date().toISOString(),
      appHash: '',
      chainId: '',
      consensusHash: '',
      dataHash: '',
      evidenceHash: '',
      nextValidatorsHash: '',
      validatorsHash: '',
      proposerAddress: '',
      numberOfTx: 0,
      voteExtensions: undefined,
    }
  }

  private static async fetchBlocksGraphQL(
    limit: number,
    offset: number
  ): Promise<Block[]> {
    const client = await graphqlClientManager.getOrCreateClient()

    const query = gql`
      query GetBlocks($limit: Int!, $offset: Int!) {
        blocks(
          first: $limit
          skip: $offset
          orderBy: blockHeight
          orderDirection: desc
        ) {
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

    const result = await client.query({
      query: query,
      variables: { limit, offset },
      fetchPolicy: 'network-only',
    })

    // Placeholder return - replace with actual data transformation
    return []
  }

  private static async fetchTransactionByHashGraphQL(
    hash: string
  ): Promise<Transaction> {
    const client = await graphqlClientManager.getOrCreateClient()

    const query = gql`
      query GetTransactionByHash($hash: String!) {
        transaction(id: $hash) {
          id
          txData
          blockHeight
          timestamp
        }
      }
    `

    const result = await client.query({
      query: query,
      variables: { hash },
      fetchPolicy: 'network-only',
    })

    // Placeholder return - replace with actual data transformation
    return {
      id: hash,
      txData: '',
      blockHeight: '0',
      timestamp: new Date().toISOString(),
    }
  }

  private static async fetchTransactionsGraphQL(
    limit: number,
    offset: number
  ): Promise<Transaction[]> {
    const client = await graphqlClientManager.getOrCreateClient()

    const query = gql`
      query GetTransactions($limit: Int!, $offset: Int!) {
        transactions(
          first: $limit
          skip: $offset
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          txData
          blockHeight
          timestamp
        }
      }
    `

    const result = await client.query({
      query: query,
      variables: { limit, offset },
      fetchPolicy: 'network-only',
    })

    // Placeholder return - replace with actual data transformation
    return []
  }

  private static async fetchValidatorsGraphQL(): Promise<Validator[]> {
    const client = await graphqlClientManager.getOrCreateClient()

    const query = gql`
      query GetValidators {
        validators {
          id
          operatorAddress
          consensusPubkey
          consensusAddress
          delegatorAddress
          jailed
          bondStatus
          tokens
          delegatorShares
          description {
            moniker
            identity
            website
            securityContact
            details
          }
          unbondingHeight
          unbondingTime
          commission {
            commissionRates {
              rate
              maxRate
              maxChangeRate
            }
            updateTime
          }
          minSelfDelegation
          unbondingOnHoldRefCount
          unbondingIds
          missedBlocks
        }
      }
    `

    const result = await client.query({
      query: query,
      fetchPolicy: 'network-only',
    })

    // Placeholder return - replace with actual data transformation
    return []
  }

  private static async fetchReportersGraphQL(): Promise<Reporter[]> {
    const client = await graphqlClientManager.getOrCreateClient()

    const query = gql`
      query GetReporters {
        reporters {
          id
          creationHeight
          commissionRate
          LastUpdated
          minTokensRequired
          moniker
          jailed
          jailedUntil
        }
      }
    `

    const result = await client.query({
      query: query,
      fetchPolicy: 'network-only',
    })

    // Placeholder return - replace with actual data transformation
    return []
  }

  private static async fetchAggregateReportsGraphQL(
    queryId?: string
  ): Promise<AggregateReport[]> {
    const client = await graphqlClientManager.getOrCreateClient()

    const query = gql`
      query GetAggregateReports($queryId: String) {
        aggregateReports(where: { queryId: $queryId }) {
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
      }
    `

    const result = await client.query({
      query: query,
      variables: { queryId },
      fetchPolicy: 'network-only',
    })

    // Placeholder return - replace with actual data transformation
    return []
  }

  private static async fetchBridgeDepositsGraphQL(): Promise<BridgeDeposit[]> {
    const client = await graphqlClientManager.getOrCreateClient()

    const query = gql`
      query GetBridgeDeposits {
        bridgeDeposits {
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
      }
    `

    const result = await client.query({
      query: query,
      fetchPolicy: 'network-only',
    })

    // Placeholder return - replace with actual data transformation
    return []
  }

  private static async fetchGovProposalsGraphQL(): Promise<GovProposal[]> {
    const client = await graphqlClientManager.getOrCreateClient()

    const query = gql`
      query GetGovProposals {
        govProposals {
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
      }
    `

    const result = await client.query({
      query: query,
      fetchPolicy: 'network-only',
    })

    // Placeholder return - replace with actual data transformation
    return []
  }

  // RPC Implementation Methods (for blockchain data)
  private static async fetchLatestBlockRPC(): Promise<Block> {
    const data = await this.callRPC<RPCBlockResponse>('/block')

    // Transform RPC response to unified format
    return {
      id: data.result.block.header.height,
      blockHeight: data.result.block.header.height,
      blockHash: data.result.block_id.hash,
      blockTime: data.result.block.header.time,
      appHash: data.result.block.header.app_hash || '',
      chainId: data.result.block.header.chain_id || '',
      consensusHash: data.result.block.header.consensus_hash || '',
      dataHash: data.result.block.header.data_hash || '',
      evidenceHash: data.result.block.header.evidence_hash || '',
      nextValidatorsHash: data.result.block.header.next_validators_hash || '',
      validatorsHash: data.result.block.header.validators_hash || '',
      proposerAddress: data.result.block.header.proposer_address,
      numberOfTx: data.result.block.data.txs?.length || 0,
      voteExtensions: undefined,
    }
  }

  private static async fetchBlockByHeightRPC(height: number): Promise<Block> {
    const data = await this.callRPC<RPCBlockResponse>(`/block?height=${height}`)

    // Transform RPC response to unified format
    return {
      id: data.result.block.header.height,
      blockHeight: data.result.block.header.height,
      blockHash: data.result.block_id.hash,
      blockTime: data.result.block.header.time,
      appHash: data.result.block.header.app_hash || '',
      chainId: data.result.block.header.chain_id || '',
      consensusHash: data.result.block.header.consensus_hash || '',
      dataHash: data.result.block.header.data_hash || '',
      evidenceHash: data.result.block.header.evidence_hash || '',
      nextValidatorsHash: data.result.block.header.next_validators_hash || '',
      validatorsHash: data.result.block.header.validators_hash || '',
      proposerAddress: data.result.block.header.proposer_address,
      numberOfTx: data.result.block.data.txs?.length || 0,
      voteExtensions: undefined,
    }
  }

  private static async fetchBlocksRPC(
    limit: number,
    offset: number
  ): Promise<Block[]> {
    // RPC doesn't have direct pagination, so we need to fetch latest and work backwards
    const latestBlock = await this.fetchLatestBlockRPC()
    const blocks: Block[] = []

    for (let i = 0; i < limit; i++) {
      const height = parseInt(latestBlock.blockHeight) - offset - i
      if (height >= 0) {
        try {
          const block = await this.fetchBlockByHeightRPC(height)
          blocks.push(block)
        } catch (error) {
          console.warn(`Failed to fetch block ${height}:`, error)
          break
        }
      }
    }

    return blocks
  }

  private static async fetchTransactionByHashRPC(
    hash: string
  ): Promise<Transaction> {
    const data = await this.callRPC<RPCTransactionResponse>(`/tx?hash=${hash}`)

    // Transform RPC response to unified format
    return {
      id: data.result.hash,
      txData: JSON.stringify(data.result.tx),
      blockHeight: data.result.height,
      timestamp: data.result.timestamp,
    }
  }

  private static async fetchTransactionsRPC(
    limit: number,
    offset: number
  ): Promise<Transaction[]> {
    // RPC doesn't have direct transaction pagination, so we need to fetch blocks and extract transactions
    const blocks = await this.fetchBlocksRPC(limit, offset)
    const transactions: Transaction[] = []

    for (const block of blocks) {
      // TODO: Implement transaction extraction from blocks
      // This would require additional RPC calls to get transaction details
    }

    return transactions
  }

  // Swagger API Implementation Methods (for validators and reporters)
  private static async fetchValidatorsSwagger(): Promise<Validator[]> {
    const data = await this.callSwaggerAPI<SwaggerValidatorResponse>(
      '/validators'
    )

    // Transform Swagger response to unified format
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
        commissionRates: undefined,
        updateTime: new Date().toISOString(),
      },
      minSelfDelegation: '0',
      unbondingOnHoldRefCount: undefined,
      unbondingIds: undefined,
      missedBlocks: 0,
      delegations: undefined,
    }))
  }

  private static async fetchReportersSwagger(): Promise<Reporter[]> {
    const data = await this.callSwaggerAPI<SwaggerReporterResponse>(
      '/reporters'
    )

    // Transform Swagger response to unified format
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

  // ============================================================================
  // COMMENTED OUT FALLBACK IMPLEMENTATIONS
  // Uncomment and implement the ones you want to use
  // ============================================================================

  // Aggregate Reports Fallback Options
  /*
  private static async fetchAggregateReportsRPC(queryId?: string): Promise<AggregateReport[]> {
    // TODO: Implement RPC fallback for aggregate reports
    // This would require custom RPC endpoints for oracle data
    const path = queryId ? `/oracle/aggregate-reports?queryId=${queryId}` : '/oracle/aggregate-reports'
    const data = await this.callRPC<any>(path)
    
    // Transform RPC response to unified format
    return data.result.aggregateReports?.map((report: any) => ({
      id: report.id,
      queryId: report.queryId,
      queryData: report.queryData,
      value: report.value,
      aggregatePower: report.aggregatePower,
      microReportHeight: report.microReportHeight,
      blockHeight: report.blockHeight,
      timestamp: report.timestamp,
      flagged: report.flagged,
      totalReporters: report.totalReporters,
      totalPower: report.totalPower,
      cyclist: report.cyclist
    })) || []
  }

  private static async fetchAggregateReportsSwagger(queryId?: string): Promise<AggregateReport[]> {
    // TODO: Implement Swagger API fallback for aggregate reports
    const path = queryId ? `/oracle/aggregate-reports?queryId=${queryId}` : '/oracle/aggregate-reports'
    const data = await this.callSwaggerAPI<any>(path)
    
    // Transform Swagger response to unified format
    return data.aggregateReports?.map((report: any) => ({
      id: report.id,
      queryId: report.queryId,
      queryData: report.queryData,
      value: report.value,
      aggregatePower: report.aggregatePower,
      microReportHeight: report.microReportHeight,
      blockHeight: report.blockHeight,
      timestamp: report.timestamp,
      flagged: report.flagged,
      totalReporters: report.totalReporters,
      totalPower: report.totalPower,
      cyclist: report.cyclist
    })) || []
  }
  */

  // Bridge Deposits Fallback Options
  /*
  private static async fetchBridgeDepositsRPC(): Promise<BridgeDeposit[]> {
    // TODO: Implement RPC fallback for bridge deposits
    const data = await this.callRPC<any>('/bridge/deposits')
    
    // Transform RPC response to unified format
    return data.result.deposits?.map((deposit: any) => ({
      id: deposit.id,
      depositId: deposit.depositId,
      blockHeight: deposit.blockHeight,
      timestamp: deposit.timestamp,
      sender: deposit.sender,
      recipient: deposit.recipient,
      amount: deposit.amount,
      tip: deposit.tip,
      reported: deposit.reported,
      claimed: deposit.claimed
    })) || []
  }

  private static async fetchBridgeDepositsSwagger(): Promise<BridgeDeposit[]> {
    // TODO: Implement Swagger API fallback for bridge deposits
    const data = await this.callSwaggerAPI<any>('/bridge/deposits')
    
    // Transform Swagger response to unified format
    return data.deposits?.map((deposit: any) => ({
      id: deposit.id,
      depositId: deposit.depositId,
      blockHeight: deposit.blockHeight,
      timestamp: deposit.timestamp,
      sender: deposit.sender,
      recipient: deposit.recipient,
      amount: deposit.amount,
      tip: deposit.tip,
      reported: deposit.reported,
      claimed: deposit.claimed
    })) || []
  }
  */

  // Governance Proposals Fallback Options
  /*
  private static async fetchGovProposalsRPC(): Promise<GovProposal[]> {
    // TODO: Implement RPC fallback for governance proposals
    const data = await this.callRPC<any>('/gov/proposals')
    
    // Transform RPC response to unified format
    return data.result.proposals?.map((proposal: any) => ({
      id: proposal.id,
      proposalId: proposal.proposalId,
      messages: proposal.messages,
      status: proposal.status,
      submitTime: proposal.submitTime,
      depositEndTime: proposal.depositEndTime,
      votingStartTime: proposal.votingStartTime,
      votingEndTime: proposal.votingEndTime,
      metaData: proposal.metaData,
      title: proposal.title,
      summary: proposal.summary,
      proposer: proposal.proposer,
      expedited: proposal.expedited,
      votes: proposal.votes
    })) || []
  }

  private static async fetchGovProposalsSwagger(): Promise<GovProposal[]> {
    // TODO: Implement Swagger API fallback for governance proposals
    const data = await this.callSwaggerAPI<any>('/gov/proposals')
    
    // Transform Swagger response to unified format
    return data.proposals?.map((proposal: any) => ({
      id: proposal.id,
      proposalId: proposal.proposalId,
      messages: proposal.messages,
      status: proposal.status,
      submitTime: proposal.submitTime,
      depositEndTime: proposal.depositEndTime,
      votingStartTime: proposal.votingStartTime,
      votingEndTime: proposal.votingEndTime,
      metaData: proposal.metaData,
      title: proposal.title,
      summary: proposal.summary,
      proposer: proposal.proposer,
      expedited: proposal.expedited,
      votes: proposal.votes
    })) || []
  }
  */

  // Additional Fallback Options for Other Methods
  /*
  // Micro Reports Fallback Options
  private static async fetchMicroReportsRPC(queryId?: string): Promise<MicroReport[]> {
    const path = queryId ? `/oracle/micro-reports?queryId=${queryId}` : '/oracle/micro-reports'
    const data = await this.callRPC<any>(path)
    
    return data.result.microReports?.map((report: any) => ({
      id: report.id,
      queryId: report.queryId,
      queryIdHeight: report.queryIdHeight,
      metaId: report.metaId,
      height: report.height,
      reporter: report.reporter,
      power: report.power,
      cycleList: report.cycleList
    })) || []
  }

  private static async fetchMicroReportsSwagger(queryId?: string): Promise<MicroReport[]> {
    const path = queryId ? `/oracle/micro-reports?queryId=${queryId}` : '/oracle/micro-reports'
    const data = await this.callSwaggerAPI<any>(path)
    
    return data.microReports?.map((report: any) => ({
      id: report.id,
      queryId: report.queryId,
      queryIdHeight: report.queryIdHeight,
      metaId: report.metaId,
      height: report.height,
      reporter: report.reporter,
      power: report.power,
      cycleList: report.cycleList
    })) || []
  }

  // Delegations Fallback Options
  private static async fetchDelegationsRPC(validatorAddress?: string): Promise<Delegation[]> {
    const path = validatorAddress ? `/staking/delegations?validator=${validatorAddress}` : '/staking/delegations'
    const data = await this.callRPC<any>(path)
    
    return data.result.delegations?.map((delegation: any) => ({
      id: delegation.id,
      delegatorAddress: delegation.delegatorAddress,
      validatorAddress: delegation.validatorAddress,
      shares: delegation.shares
    })) || []
  }

  private static async fetchDelegationsSwagger(validatorAddress?: string): Promise<Delegation[]> {
    const path = validatorAddress ? `/staking/delegations?validator=${validatorAddress}` : '/staking/delegations'
    const data = await this.callSwaggerAPI<any>(path)
    
    return data.delegations?.map((delegation: any) => ({
      id: delegation.id,
      delegatorAddress: delegation.delegatorAddress,
      validatorAddress: delegation.validatorAddress,
      shares: delegation.shares
    })) || []
  }

  // Withdraws Fallback Options
  private static async fetchWithdrawsRPC(): Promise<Withdraw[]> {
    const data = await this.callRPC<any>('/bridge/withdraws')
    
    return data.result.withdraws?.map((withdraw: any) => ({
      id: withdraw.id,
      depositId: withdraw.depositId,
      blockHeight: withdraw.blockHeight,
      sender: withdraw.sender,
      recipient: withdraw.recipient,
      amount: withdraw.amount
    })) || []
  }

  private static async fetchWithdrawsSwagger(): Promise<Withdraw[]> {
    const data = await this.callSwaggerAPI<any>('/bridge/withdraws')
    
    return data.withdraws?.map((withdraw: any) => ({
      id: withdraw.id,
      depositId: withdraw.depositId,
      blockHeight: withdraw.blockHeight,
      sender: withdraw.sender,
      recipient: withdraw.recipient,
      amount: withdraw.amount
    })) || []
  }

  // Votes Fallback Options
  private static async fetchVotesRPC(proposalId?: number): Promise<Vote[]> {
    const path = proposalId ? `/gov/votes?proposalId=${proposalId}` : '/gov/votes'
    const data = await this.callRPC<any>(path)
    
    return data.result.votes?.map((vote: any) => ({
      id: vote.id,
      proposal: vote.proposal,
      option: vote.option,
      metaData: vote.metaData
    })) || []
  }

  private static async fetchVotesSwagger(proposalId?: number): Promise<Vote[]> {
    const path = proposalId ? `/gov/votes?proposalId=${proposalId}` : '/gov/votes'
    const data = await this.callSwaggerAPI<any>(path)
    
    return data.votes?.map((vote: any) => ({
      id: vote.id,
      proposal: vote.proposal,
      option: vote.option,
      metaData: vote.metaData
    })) || []
  }

  // Parameters Fallback Options
  private static async fetchStakingParamsRPC(): Promise<StakingParams> {
    const data = await this.callRPC<any>('/params/staking')
    
    return {
      id: 'stakingParams',
      unbondingTime: data.result.unbondingTime,
      maxValidators: data.result.maxValidators,
      maxEntries: data.result.maxEntries,
      historicalEntries: data.result.historicalEntries,
      bondDenom: data.result.bondDenom,
      minCommissionRate: data.result.minCommissionRate
    }
  }

  private static async fetchStakingParamsSwagger(): Promise<StakingParams> {
    const data = await this.callSwaggerAPI<any>('/params/staking')
    
    return {
      id: 'stakingParams',
      unbondingTime: data.unbondingTime,
      maxValidators: data.maxValidators,
      maxEntries: data.maxEntries,
      historicalEntries: data.historicalEntries,
      bondDenom: data.bondDenom,
      minCommissionRate: data.minCommissionRate
    }
  }
  */
}

// Export convenience functions
export const getLatestBlock = (options?: FetchOptions) =>
  UnifiedDataService.getLatestBlock(options)
export const getBlockByHeight = (height: number, options?: FetchOptions) =>
  UnifiedDataService.getBlockByHeight(height, options)
export const getBlocks = (
  limit?: number,
  offset?: number,
  options?: FetchOptions
) => UnifiedDataService.getBlocks(limit, offset, options)
export const getTransactionByHash = (hash: string, options?: FetchOptions) =>
  UnifiedDataService.getTransactionByHash(hash, options)
export const getTransactions = (
  limit?: number,
  offset?: number,
  options?: FetchOptions
) => UnifiedDataService.getTransactions(limit, offset, options)
export const getValidators = (options?: FetchOptions) =>
  UnifiedDataService.getValidators(options)
export const getReporters = (options?: FetchOptions) =>
  UnifiedDataService.getReporters(options)
export const getAggregateReports = (queryId?: string, options?: FetchOptions) =>
  UnifiedDataService.getAggregateReports(queryId, options)
export const getBridgeDeposits = (options?: FetchOptions) =>
  UnifiedDataService.getBridgeDeposits(options)
export const getGovProposals = (options?: FetchOptions) =>
  UnifiedDataService.getGovProposals(options)
