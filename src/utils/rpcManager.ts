import axios from 'axios'
import { RPC_ENDPOINTS } from './constant'

interface RPCState {
  currentIndex: number
  failures: { [key: string]: number }
  lastAttempt: { [key: string]: number }
  isCircuitOpen: { [key: string]: boolean }
}

export class RPCManager {
  private state: RPCState = {
    currentIndex: 0,
    failures: {},
    lastAttempt: {},
    isCircuitOpen: {},
  }

  private customEndpoint: string | null = null

  private readonly MAX_FAILURES = 5
  private readonly CIRCUIT_RESET_TIME = 60000
  private readonly HEALTH_CHECK_INTERVAL = 10000 // 10 seconds
  private readonly MAX_BACKOFF = 32000 // 32 seconds
  private readonly REQUEST_TIMEOUT = 10000 // Increase to 10 seconds

  constructor() {
    // Initialize state for all endpoints
    RPC_ENDPOINTS.forEach((endpoint) => {
      this.state.failures[endpoint] = 0
      this.state.lastAttempt[endpoint] = 0
      this.state.isCircuitOpen[endpoint] = false
    })

    // Start health checks
    this.startHealthChecks()
  }

  private async checkEndpointHealth(endpoint: string): Promise<boolean> {
    try {
      const response = await axios.get(`${endpoint}/health`)
      return response.status === 200
    } catch {
      return false
    }
  }

  private startHealthChecks() {
    setInterval(async () => {
      for (const endpoint of RPC_ENDPOINTS) {
        if (this.state.isCircuitOpen[endpoint]) {
          const timeSinceLastAttempt =
            Date.now() - this.state.lastAttempt[endpoint]
          if (timeSinceLastAttempt >= this.CIRCUIT_RESET_TIME) {
            // Try to reset circuit breaker
            const isHealthy = await this.checkEndpointHealth(endpoint)
            if (isHealthy) {
              this.resetEndpointState(endpoint)
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

  public setCustomEndpoint(endpoint: string | null) {
    this.customEndpoint = endpoint
    if (endpoint) {
      // Initialize state for custom endpoint
      this.state.failures[endpoint] = 0
      this.state.lastAttempt[endpoint] = 0
      this.state.isCircuitOpen[endpoint] = false
    }
  }

  public async getCurrentEndpoint(): Promise<string> {
    const availableEndpoints = this.getEndpoints()
    if (availableEndpoints.length === 0) {
      console.warn('No available endpoints, resetting circuit breakers')
      // Reset all circuits if no endpoints are available
      RPC_ENDPOINTS.forEach((endpoint) => this.resetEndpointState(endpoint))
      this.state.currentIndex = 0
      return RPC_ENDPOINTS[0]
    }

    const endpoint =
      availableEndpoints[this.state.currentIndex % availableEndpoints.length]
    return endpoint
  }

  public async reportFailure(endpoint: string) {
    // Don't count timeouts or "not found" errors as failures that should trigger circuit breaker
    if (endpoint === RPC_ENDPOINTS[0]) {
      // For primary endpoint, only increment failure count for true connection failures
      console.debug(`Checking failure type for primary endpoint: ${endpoint}`)
      return endpoint
    }

    console.debug(`Reporting failure for endpoint: ${endpoint}`)
    this.state.failures[endpoint] = (this.state.failures[endpoint] || 0) + 1
    this.state.lastAttempt[endpoint] = Date.now()

    if (this.state.failures[endpoint] >= this.MAX_FAILURES) {
      const timeSinceLastAttempt = Date.now() - this.state.lastAttempt[endpoint]
      if (timeSinceLastAttempt < this.CIRCUIT_RESET_TIME) {
        console.warn(`Circuit breaker triggered for endpoint: ${endpoint}`)
        this.state.isCircuitOpen[endpoint] = true

        // Move to next endpoint
        this.state.currentIndex =
          (this.state.currentIndex + 1) % RPC_ENDPOINTS.length
        const nextEndpoint = RPC_ENDPOINTS[this.state.currentIndex]

        // Reset failures for the next endpoint
        this.resetEndpointState(nextEndpoint)
        return nextEndpoint
      }
    }
    return endpoint
  }

  public async reportSuccess(endpoint: string) {
    if (endpoint === RPC_ENDPOINTS[0]) {
      RPC_ENDPOINTS.forEach((ep) => this.resetEndpointState(ep))
      this.state.currentIndex = 0
    } else {
      this.resetEndpointState(endpoint)
    }
  }

  public getEndpoints(): string[] {
    const endpoints = [...RPC_ENDPOINTS]
    if (this.customEndpoint && !endpoints.includes(this.customEndpoint)) {
      endpoints.unshift(this.customEndpoint)
    }
    return endpoints.filter((endpoint) => !this.state.isCircuitOpen[endpoint])
  }
}

// Create and export a singleton instance
export const rpcManager = new RPCManager()
