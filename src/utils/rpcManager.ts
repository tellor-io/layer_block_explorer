import axios from 'axios'
import { RPC_ENDPOINTS } from './constant'

interface RPCState {
  currentIndex: number
  failures: { [key: string]: number }
  lastAttempt: { [key: string]: number }
  isCircuitOpen: { [key: string]: boolean }
}

class RPCManager {
  private state: RPCState = {
    currentIndex: 0,
    failures: {},
    lastAttempt: {},
    isCircuitOpen: {},
  }

  private customEndpoint: string | null = null

  private readonly MAX_FAILURES = 3
  private readonly CIRCUIT_RESET_TIME = 30000 // 30 seconds
  private readonly HEALTH_CHECK_INTERVAL = 10000 // 10 seconds
  private readonly MAX_BACKOFF = 32000 // 32 seconds

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
    // If there's a custom endpoint, use it instead of the fallback list
    if (this.customEndpoint) {
      return this.customEndpoint
    }

    // Otherwise use the fallback mechanism with RPC_ENDPOINTS
    const endpoint = RPC_ENDPOINTS[this.state.currentIndex]

    // Check if we should try this endpoint
    const timeSinceLastAttempt = Date.now() - this.state.lastAttempt[endpoint]
    const requiredBackoff = this.calculateBackoff(this.state.failures[endpoint])

    if (
      this.state.isCircuitOpen[endpoint] ||
      timeSinceLastAttempt < requiredBackoff
    ) {
      // Try next endpoint
      this.state.currentIndex =
        (this.state.currentIndex + 1) % RPC_ENDPOINTS.length
      return this.getCurrentEndpoint()
    }

    return endpoint
  }

  public async reportFailure(endpoint: string) {
    this.state.failures[endpoint]++
    this.state.lastAttempt[endpoint] = Date.now()

    if (this.state.failures[endpoint] >= this.MAX_FAILURES) {
      this.state.isCircuitOpen[endpoint] = true
    }

    // Switch to next endpoint
    this.state.currentIndex =
      (this.state.currentIndex + 1) % RPC_ENDPOINTS.length
  }

  public async reportSuccess(endpoint: string) {
    this.resetEndpointState(endpoint)
  }
}

// Export singleton instance
export const rpcManager = new RPCManager()
