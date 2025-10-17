import { ApolloClient } from '@apollo/client'
import { graphqlClientManager } from './graphqlClient'
import { rpcManager } from './rpcManager'
import {
  DATA_SOURCE_CONFIG,
  GRAPHQL_ENDPOINTS,
  RPC_ENDPOINTS,
} from './constant'

export enum DataSourceType {
  GRAPHQL = 'graphql',
  RPC = 'rpc',
}

export interface DataSourceStatus {
  type: DataSourceType
  isHealthy: boolean
  isAvailable: boolean
  lastCheck: number
  failureCount: number
  responseTime?: number
}

export interface DataSourceConfig {
  primary: DataSourceType
  fallback: DataSourceType
  autoFallback: boolean
  healthCheckInterval: number
  maxFailures: number
  circuitResetTime: number
  requestTimeout: number
}

export interface FetchOptions {
  timeout?: number
  retries?: number
  forceSource?: DataSourceType
  fallbackOnError?: boolean
}

export interface FetchResult<T> {
  data: T
  source: DataSourceType
  responseTime: number
  cached: boolean
  fallbackUsed: boolean
}

export class DataSourceManager {
  private static instance: DataSourceManager
  private status: Map<DataSourceType, DataSourceStatus> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null
  private config: DataSourceConfig

  private constructor() {
    this.config = {
      primary: DataSourceType.GRAPHQL,
      fallback: DataSourceType.RPC,
      autoFallback: DATA_SOURCE_CONFIG.AUTO_FALLBACK,
      healthCheckInterval: DATA_SOURCE_CONFIG.HEALTH_CHECK_INTERVAL,
      maxFailures: 5,
      circuitResetTime: 60000,
      requestTimeout: 10000,
    }

    // Initialize status for both data sources
    this.status.set(DataSourceType.GRAPHQL, {
      type: DataSourceType.GRAPHQL,
      isHealthy: true,
      isAvailable: true,
      lastCheck: Date.now(),
      failureCount: 0,
    })

    this.status.set(DataSourceType.RPC, {
      type: DataSourceType.RPC,
      isHealthy: true,
      isAvailable: true,
      lastCheck: Date.now(),
      failureCount: 0,
    })

    this.startHealthChecks()
  }

  /**
   * Create a timeout signal for fetch requests
   * Compatible with older Node.js versions
   */
  private createTimeoutSignal(timeout: number): AbortSignal {
    // Use AbortSignal.timeout if available (Node.js 16.14.0+)
    if (typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(timeout)
    }

    // Fallback for older Node.js versions
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeout)

    // Clean up timeout when signal is aborted
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId)
    })

    return controller.signal
  }

  public static getInstance(): DataSourceManager {
    if (!DataSourceManager.instance) {
      DataSourceManager.instance = new DataSourceManager()
    }
    return DataSourceManager.instance
  }

  /**
   * Unified data fetching method with automatic fallback
   */
  public async fetchData<T>(
    fetchFunction: (source: DataSourceType) => Promise<T>,
    options: FetchOptions = {}
  ): Promise<FetchResult<T>> {
    const {
      timeout = this.config.requestTimeout,
      retries = 3,
      forceSource,
      fallbackOnError = this.config.autoFallback,
    } = options

    const startTime = Date.now()
    let lastError: Error | null = null

    // Determine the order of data sources to try
    const sourcesToTry = this.getSourcePriority(forceSource)

    for (const source of sourcesToTry) {
      if (!this.isSourceAvailable(source)) {
        console.warn(`Data source ${source} is not available, skipping`)
        continue
      }

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const data = await this.executeWithTimeout(
            fetchFunction(source),
            timeout
          )

          const responseTime = Date.now() - startTime

          // Report success
          this.reportSuccess(source, responseTime)

          return {
            data,
            source,
            responseTime,
            cached: false, // TODO: Implement caching
            fallbackUsed: source !== this.config.primary && !forceSource,
          }
        } catch (error) {
          lastError = error as Error
          console.warn(`Attempt ${attempt + 1} failed for ${source}:`, error)

          // Report failure
          this.reportFailure(source)

          // If this is the last attempt for this source, move to next source
          if (attempt === retries) {
            break
          }

          // Wait before retry with exponential backoff
          const backoff = Math.min(Math.pow(2, attempt) * 1000, 5000)
          await this.delay(backoff)
        }
      }
    }

    // All sources failed
    throw new Error(
      `All data sources failed. Last error: ${
        lastError?.message || 'Unknown error'
      }`
    )
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    })

    return Promise.race([promise, timeoutPromise])
  }

  /**
   * Get the priority order of data sources to try
   */
  private getSourcePriority(forceSource?: DataSourceType): DataSourceType[] {
    if (forceSource) {
      return [forceSource]
    }

    if (this.config.autoFallback) {
      return [this.config.primary, this.config.fallback]
    }

    return [this.config.primary]
  }

  /**
   * Check if a data source is available
   */
  private isSourceAvailable(source: DataSourceType): boolean {
    const status = this.status.get(source)
    return status?.isAvailable ?? false
  }

  /**
   * Report success for a data source
   */
  private reportSuccess(source: DataSourceType, responseTime: number): void {
    const status = this.status.get(source)
    if (status) {
      status.isHealthy = true
      status.isAvailable = true
      status.lastCheck = Date.now()
      status.failureCount = 0
      status.responseTime = responseTime
    }

    // Also report to individual managers
    if (source === DataSourceType.GRAPHQL) {
      const currentEndpoint = GRAPHQL_ENDPOINTS[0] // Assuming primary endpoint
      graphqlClientManager.reportSuccess(currentEndpoint)
    } else if (source === DataSourceType.RPC) {
      const currentEndpoint = RPC_ENDPOINTS[0] // Assuming primary endpoint
      rpcManager.reportSuccess(currentEndpoint)
    }
  }

  /**
   * Report failure for a data source
   */
  private reportFailure(source: DataSourceType): void {
    const status = this.status.get(source)
    if (status) {
      status.failureCount++
      status.lastCheck = Date.now()

      // Open circuit breaker if too many failures
      if (status.failureCount >= this.config.maxFailures) {
        status.isAvailable = false
        console.warn(`Circuit breaker opened for ${source} data source`)
      }
    }

    // Also report to individual managers
    if (source === DataSourceType.GRAPHQL) {
      const currentEndpoint = GRAPHQL_ENDPOINTS[0]
      graphqlClientManager.reportFailure(currentEndpoint)
    } else if (source === DataSourceType.RPC) {
      const currentEndpoint = RPC_ENDPOINTS[0]
      rpcManager.reportFailure(currentEndpoint)
    }
  }

  /**
   * Start health checks for all data sources
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks()
    }, this.config.healthCheckInterval)
  }

  /**
   * Perform health checks for all data sources
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = [
      this.checkGraphQLHealth(),
      this.checkRPCHealth(),
    ]

    await Promise.allSettled(healthCheckPromises)
  }

  /**
   * Check GraphQL endpoint health
   */
  private async checkGraphQLHealth(): Promise<void> {
    // Skip GraphQL health checks on server side
    if (typeof window === 'undefined') {
      this.reportFailure(DataSourceType.GRAPHQL)
      return
    }

    try {
      const client = await graphqlClientManager.getOrCreateClient()
      const startTime = Date.now()

      // Simple introspection query to check health
      const response = await fetch(GRAPHQL_ENDPOINTS[0], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: '{ __schema { types { name } } }',
        }),
        signal: this.createTimeoutSignal(this.config.requestTimeout),
      })

      if (response.ok) {
        const responseTime = Date.now() - startTime
        this.reportSuccess(DataSourceType.GRAPHQL, responseTime)
      } else {
        throw new Error(
          `GraphQL health check failed with status ${response.status}`
        )
      }
    } catch (error) {
      console.warn('GraphQL health check failed:', error)
      this.reportFailure(DataSourceType.GRAPHQL)
    }
  }

  /**
   * Check RPC endpoint health
   */
  private async checkRPCHealth(): Promise<void> {
    try {
      const endpoint = await rpcManager.getCurrentEndpoint()
      const startTime = Date.now()

      const response = await fetch(`${endpoint}/status`, {
        method: 'GET',
        signal: this.createTimeoutSignal(this.config.requestTimeout),
      })

      if (response.ok) {
        const responseTime = Date.now() - startTime
        this.reportSuccess(DataSourceType.RPC, responseTime)
      } else {
        throw new Error(
          `RPC health check failed with status ${response.status}`
        )
      }
    } catch (error) {
      console.warn('RPC health check failed:', error)
      this.reportFailure(DataSourceType.RPC)
    }
  }

  /**
   * Get current status of all data sources
   */
  public getStatus(): Map<DataSourceType, DataSourceStatus> {
    return new Map(this.status)
  }

  /**
   * Get status of a specific data source
   */
  public getSourceStatus(source: DataSourceType): DataSourceStatus | undefined {
    return this.status.get(source)
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<DataSourceConfig>): void {
    this.config = { ...this.config, ...config }

    // Restart health checks if interval changed
    if (config.healthCheckInterval) {
      this.startHealthChecks()
    }
  }

  /**
   * Force reset circuit breaker for a data source
   */
  public resetCircuitBreaker(source: DataSourceType): void {
    const status = this.status.get(source)
    if (status) {
      status.isAvailable = true
      status.failureCount = 0
      status.isHealthy = true
    }
  }

  /**
   * Get Apollo Client for GraphQL operations
   */
  public async getGraphQLClient(): Promise<ApolloClient> {
    return await graphqlClientManager.getOrCreateClient()
  }

  /**
   * Get current RPC endpoint
   */
  public async getRPCEndpoint(): Promise<string> {
    return await rpcManager.getCurrentEndpoint()
  }

  /**
   * Set custom endpoint for a data source
   */
  public async setCustomEndpoint(
    source: DataSourceType,
    endpoint: string | null
  ): Promise<void> {
    if (source === DataSourceType.GRAPHQL) {
      if (endpoint) {
        await graphqlClientManager.setCustomEndpoint(endpoint)
      }
    } else if (source === DataSourceType.RPC) {
      if (endpoint) {
        await rpcManager.setCustomEndpoint(endpoint)
      }
    }
  }

  /**
   * Get current data source status
   */
  public getDataSourceStatus(): {
    graphql: DataSourceStatus & {
      circuitBreakerOpen?: boolean
      circuitBreakerHalfOpen?: boolean
    }
    rpc: DataSourceStatus & {
      circuitBreakerOpen?: boolean
      circuitBreakerHalfOpen?: boolean
    }
  } {
    const graphqlStatus = this.status.get(DataSourceType.GRAPHQL)!
    const rpcStatus = this.status.get(DataSourceType.RPC)!

    return {
      graphql: {
        ...graphqlStatus,
        circuitBreakerOpen:
          graphqlStatus.failureCount >= this.config.maxFailures,
        circuitBreakerHalfOpen:
          graphqlStatus.failureCount > 0 &&
          graphqlStatus.failureCount < this.config.maxFailures,
      },
      rpc: {
        ...rpcStatus,
        circuitBreakerOpen: rpcStatus.failureCount >= this.config.maxFailures,
        circuitBreakerHalfOpen:
          rpcStatus.failureCount > 0 &&
          rpcStatus.failureCount < this.config.maxFailures,
      },
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    graphqlClientManager.destroy()
  }
}

// Export singleton instance
export const dataSourceManager = DataSourceManager.getInstance()

// Export convenience functions
export const fetchWithFallback = <T>(
  fetchFunction: (source: DataSourceType) => Promise<T>,
  options?: FetchOptions
): Promise<FetchResult<T>> => {
  return dataSourceManager.fetchData(fetchFunction, options)
}

export const getDataSourceStatus = (): Map<
  DataSourceType,
  DataSourceStatus
> => {
  return dataSourceManager.getStatus()
}

export const isDataSourceHealthy = (source: DataSourceType): boolean => {
  const status = dataSourceManager.getSourceStatus(source)
  return status?.isHealthy ?? false
}
