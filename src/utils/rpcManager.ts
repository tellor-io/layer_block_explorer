import axios from 'axios'
import { stakingCache } from '@/datasources/live/stakingCache'
import {
  LS_ACTIVE_NETWORK,
  LS_RPC_ADDRESS,
  LayerNetwork,
  getDefaultNetwork,
  getRpcEndpointsForNetwork,
  normalizeNetwork,
} from './constant'

/**
 * HYBRID ARCHITECTURE - Phase 3 Migration
 * 
 * This RPCManager now handles only Tellor-specific data endpoints that are not available in GraphQL.
 * 
 * GraphQL Data Sources (via /src/datasources/graphql/):
 * - Blocks, Validators, Proposals, Delegations, Reporters (basic data)
 * 
 * RPC Data Sources (via this manager):
 * - Current cycle lists (/api/current-cycle)
 * - Staking/unstaking amounts (/api/staking-amount, /api/unstaking-amount)
 * - Allowed amount expiration (/api/allowed-amount-exp)
 * - Oracle data queries (/api/oracle-data/[queryId])
 * - Bridge data (/api/bridge-data/[queryId]/[timestamp])
 * - Bridge attestations (/api/bridge-attestations/[snapshot])
 * - EVM validators (/api/evm-validators)
 * - Reporter counts (/api/reporter-count)
 * - Reporter selectors (/api/reporter-selectors/[reporter])
 * 
 * This hybrid approach ensures we get the best of both worlds:
 * - Fast, indexed data from GraphQL for standard Cosmos operations
 * - Real-time, Tellor-specific data from RPC for custom module queries
 */

interface RPCState {
  currentIndex: number
  failures: { [key: string]: number }
  lastAttempt: { [key: string]: number }
  isCircuitOpen: { [key: string]: boolean }
  isConnected: boolean
}

export class RPCManager {
  private static instance: RPCManager
  private state: RPCState = {
    currentIndex: 0,
    failures: {},
    lastAttempt: {},
    isCircuitOpen: {},
    isConnected: false,
  }

  private customEndpoint: string | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  private activeNetwork: LayerNetwork = getDefaultNetwork()
  private isNetworkSwitching = false
  private networkListeners = new Set<() => void>()
  private switchingListeners = new Set<() => void>()

  private readonly MAX_FAILURES = 5
  private readonly CIRCUIT_RESET_TIME = 60000
  private readonly HEALTH_CHECK_INTERVAL = 10000 // 10 seconds
  private readonly MAX_BACKOFF = 32000 // 32 seconds
  private readonly REQUEST_TIMEOUT = 10000 // Increase to 10 seconds

  private constructor() {
    if (typeof window !== 'undefined') {
      const savedNetwork = window.localStorage.getItem(LS_ACTIVE_NETWORK)
      if (savedNetwork) {
        this.activeNetwork = normalizeNetwork(savedNetwork)
      }
      document.cookie = `${LS_ACTIVE_NETWORK}=${this.activeNetwork}; path=/; max-age=31536000`

      const savedEndpoint = window.localStorage.getItem(LS_RPC_ADDRESS)
      if (savedEndpoint) {
        this.setCustomEndpoint(savedEndpoint)
      }
    }

    this.initializeStateForEndpoints(this.getAllKnownEndpoints())
    this.startHealthChecks()
  }

  public static getInstance(): RPCManager {
    if (!RPCManager.instance) {
      RPCManager.instance = new RPCManager()
    }
    return RPCManager.instance
  }

  private getAllKnownEndpoints(): string[] {
    return [
      ...getRpcEndpointsForNetwork('mainnet'),
      ...getRpcEndpointsForNetwork('palmito'),
      ...(this.customEndpoint ? [this.customEndpoint] : []),
    ]
  }

  private initializeStateForEndpoints(endpoints: string[]) {
    endpoints.forEach((endpoint) => {
      if (!this.state.failures[endpoint]) this.state.failures[endpoint] = 0
      if (!this.state.lastAttempt[endpoint]) this.state.lastAttempt[endpoint] = 0
      if (!this.state.isCircuitOpen[endpoint])
        this.state.isCircuitOpen[endpoint] = false
    })
  }

  public getActiveNetwork(): LayerNetwork {
    return this.activeNetwork
  }

  public getIsNetworkSwitching(): boolean {
    return this.isNetworkSwitching
  }

  /** Subscribe to active-network changes (for useSyncExternalStore). */
  public subscribe(listener: () => void): () => void {
    this.networkListeners.add(listener)
    return () => {
      this.networkListeners.delete(listener)
    }
  }

  /** Subscribe to soft-refresh / switching UI state. */
  public subscribeSwitching(listener: () => void): () => void {
    this.switchingListeners.add(listener)
    return () => {
      this.switchingListeners.delete(listener)
    }
  }

  public setNetworkSwitching(isSwitching: boolean) {
    if (this.isNetworkSwitching === isSwitching) return
    this.isNetworkSwitching = isSwitching
    this.switchingListeners.forEach((listener) => listener())
  }

  private notifyNetworkListeners() {
    this.networkListeners.forEach((listener) => listener())
  }

  public async setActiveNetwork(network: LayerNetwork) {
    this.activeNetwork = normalizeNetwork(network)
    this.state.currentIndex = 0
    this.customEndpoint = null
    this.state.isConnected = false
    this.initializeStateForEndpoints(this.getEndpoints())
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LS_ACTIVE_NETWORK, this.activeNetwork)
      window.localStorage.removeItem(LS_RPC_ADDRESS)
      document.cookie = `${LS_ACTIVE_NETWORK}=${this.activeNetwork}; path=/; max-age=31536000`
      stakingCache.clear()
    }
    await this.clearCaches()
    this.notifyNetworkListeners()
  }

  private async checkEndpointHealth(endpoint: string): Promise<boolean> {
    try {
      const response = await axios.get(`${endpoint}/status`, {
        timeout: this.REQUEST_TIMEOUT,
      })
      return (
        response.status === 200 &&
        response.data?.result?.sync_info !== undefined
      )
    } catch {
      return false
    }
  }

  private startHealthChecks() {
    // Clear any existing interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(async () => {
      // Only check health if we're not connected or if the current endpoint is in circuit open state
      if (!this.state.isConnected) {
        const currentEndpoint = await this.getCurrentEndpoint()
        if (this.state.isCircuitOpen[currentEndpoint]) {
          const timeSinceLastAttempt =
            Date.now() - this.state.lastAttempt[currentEndpoint]
          if (timeSinceLastAttempt >= this.CIRCUIT_RESET_TIME) {
            const isHealthy = await this.checkEndpointHealth(currentEndpoint)
            if (isHealthy) {
              this.resetEndpointState(currentEndpoint)
            }
          }
        }
      }
    }, this.HEALTH_CHECK_INTERVAL)
  }

  private resetEndpointState(endpoint: string) {
    this.state.failures[endpoint] = 0
    this.state.isCircuitOpen[endpoint] = false
    this.state.lastAttempt[endpoint] = Date.now()
  }

  private calculateBackoff(failures: number): number {
    return Math.min(Math.pow(2, failures) * 1000, this.MAX_BACKOFF)
  }

  public async setCustomEndpoint(endpoint: string | null) {
    this.customEndpoint = endpoint
    if (endpoint) {
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LS_RPC_ADDRESS, endpoint)
        stakingCache.clear()
      }
      // Initialize state for custom endpoint
      this.state.failures[endpoint] = 0
      this.state.lastAttempt[endpoint] = 0
      this.state.isCircuitOpen[endpoint] = false
      // Reset current index to ensure we start with the custom endpoint
      this.state.currentIndex = 0
      this.initializeStateForEndpoints([endpoint])
      // Clear any caches when switching endpoints
      await this.clearCaches()
    } else if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LS_RPC_ADDRESS)
    }
  }

  // Method to clear any caches when switching endpoints
  private async clearCaches() {
    // Clear any in-memory caches that might be holding stale data
    try {
      // Clear the reporter count cache (Tellor-specific data)
      await fetch('/api/reporter-count?clearCache=true')

      // Clear other Tellor-specific caches by making fresh requests
      // Note: Standard Cosmos data (blocks, validators, proposals) now uses GraphQL
      const cacheClearingPromises = [
        fetch('/api/evm-validators').catch(() => {}),
        fetch('/api/current-cycle').catch(() => {}),
        fetch('/api/staking-amount').catch(() => {}),
        fetch('/api/unstaking-amount').catch(() => {}),
      ]

      await Promise.all(cacheClearingPromises)
    } catch (error) {
      console.warn('Failed to clear some caches:', error)
    }
  }

  public getEndpointsForNetwork(network: LayerNetwork): string[] {
    return getRpcEndpointsForNetwork(network)
  }

  public async getCurrentEndpoint(networkOverride?: string): Promise<string> {
    const selectedNetwork = normalizeNetwork(networkOverride || this.activeNetwork)
    const availableEndpoints = this.getEndpointsForNetwork(selectedNetwork).filter(
      (endpoint) => !this.state.isCircuitOpen[endpoint]
    )
    if (availableEndpoints.length === 0) {
      console.warn('No available endpoints, resetting circuit breakers')
      // Reset all circuits if no endpoints are available
      this.getEndpointsForNetwork(selectedNetwork).forEach((endpoint) =>
        this.resetEndpointState(endpoint)
      )
      this.state.currentIndex = 0
      return this.getEndpointsForNetwork(selectedNetwork)[0]
    }

    // If we have a custom endpoint, always return it first
    if (
      selectedNetwork === this.activeNetwork &&
      this.customEndpoint &&
      availableEndpoints.includes(this.customEndpoint)
    ) {
      return this.customEndpoint
    }

    // Otherwise, use the round-robin logic for default endpoints
    const endpoint =
      availableEndpoints[this.state.currentIndex % availableEndpoints.length]
    return endpoint
  }

  public async reportSuccess(endpoint: string) {
    this.state.isConnected = true
    if (endpoint === this.getEndpointsForActiveNetwork()[0]) {
      this.getEndpointsForActiveNetwork().forEach((ep) => this.resetEndpointState(ep))
      this.state.currentIndex = 0
    } else {
      this.resetEndpointState(endpoint)
    }
  }

  public async reportFailure(endpoint: string) {
    this.state.isConnected = false
    console.debug(`Reporting failure for endpoint: ${endpoint}`)
    this.state.failures[endpoint] = (this.state.failures[endpoint] || 0) + 1
    this.state.lastAttempt[endpoint] = Date.now()

    if (
      this.state.failures[endpoint] >= this.MAX_FAILURES ||
      endpoint === this.getEndpointsForActiveNetwork()[0]
    ) {
      console.warn(`Circuit breaker triggered for endpoint: ${endpoint}`)
      this.state.isCircuitOpen[endpoint] = true

      // Move to next endpoint immediately
      const availableEndpoints = this.getEndpoints()
      if (availableEndpoints.length > 0) {
        const nextEndpoint = availableEndpoints[0]
        this.state.currentIndex = this.getEndpointsForActiveNetwork().indexOf(
          nextEndpoint
        )
        return nextEndpoint
      }
    }
    return endpoint
  }

  public getEndpointsForActiveNetwork(): string[] {
    return getRpcEndpointsForNetwork(this.activeNetwork)
  }

  public getEndpoints(): string[] {
    const endpoints = [...this.getEndpointsForActiveNetwork()]
    if (this.customEndpoint && !endpoints.includes(this.customEndpoint)) {
      endpoints.unshift(this.customEndpoint)
    }
    this.initializeStateForEndpoints(endpoints)
    return endpoints.filter((endpoint) => !this.state.isCircuitOpen[endpoint])
  }
}

// Export a singleton instance
export const rpcManager = RPCManager.getInstance()
