import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import { RetryLink } from '@apollo/client/link/retry'
import { setContext } from '@apollo/client/link/context'
import { GRAPHQL_ENDPOINTS, DATA_SOURCE_CONFIG } from './constant'

interface GraphQLState {
  currentIndex: number
  failures: { [key: string]: number }
  lastAttempt: { [key: string]: number }
  isCircuitOpen: { [key: string]: boolean }
  isConnected: boolean
}

export class GraphQLClientManager {
  private static instance: GraphQLClientManager
  private state: GraphQLState = {
    currentIndex: 0,
    failures: {},
    lastAttempt: {},
    isCircuitOpen: {},
    isConnected: false,
  }

  private customEndpoint: string | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  private client: ApolloClient | null = null

  private readonly MAX_FAILURES = 5
  private readonly CIRCUIT_RESET_TIME = 60000
  private readonly HEALTH_CHECK_INTERVAL = DATA_SOURCE_CONFIG.HEALTH_CHECK_INTERVAL
  private readonly MAX_BACKOFF = 32000 // 32 seconds
  private readonly REQUEST_TIMEOUT = DATA_SOURCE_CONFIG.GRAPHQL_TIMEOUT

  private constructor() {
    // Initialize state for all endpoints
    GRAPHQL_ENDPOINTS.forEach((endpoint) => {
      this.state.failures[endpoint] = 0
      this.state.lastAttempt[endpoint] = 0
      this.state.isCircuitOpen[endpoint] = false
    })

    this.startHealthChecks()
  }

  public static getInstance(): GraphQLClientManager {
    if (!GraphQLClientManager.instance) {
      GraphQLClientManager.instance = new GraphQLClientManager()
    }
    return GraphQLClientManager.instance
  }

  private async checkEndpointHealth(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: '{ __schema { types { name } } }',
        }),
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT),
      })
      return response.ok
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
          const timeSinceLastAttempt = Date.now() - this.state.lastAttempt[currentEndpoint]
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
    this.state.lastAttempt[endpoint] = 0
    this.state.isCircuitOpen[endpoint] = false
  }

  private reportFailure(endpoint: string) {
    this.state.failures[endpoint] = (this.state.failures[endpoint] || 0) + 1
    this.state.lastAttempt[endpoint] = Date.now()
    
    if (this.state.failures[endpoint] >= this.MAX_FAILURES) {
      this.state.isCircuitOpen[endpoint] = true
      console.warn(`Circuit breaker opened for endpoint: ${endpoint}`)
    }
  }

  private reportSuccess(endpoint: string) {
    this.state.failures[endpoint] = 0
    this.state.isCircuitOpen[endpoint] = false
    this.state.isConnected = true
  }

  public async getCurrentEndpoint(): Promise<string> {
    if (this.customEndpoint) {
      return this.customEndpoint
    }

    // Find the first available endpoint
    for (const endpoint of GRAPHQL_ENDPOINTS) {
      if (!this.state.isCircuitOpen[endpoint]) {
        return endpoint
      }
    }

    // If all endpoints are in circuit open state, try the first one
    return GRAPHQL_ENDPOINTS[0]
  }

  public getEndpoints(): string[] {
    const endpoints = [...GRAPHQL_ENDPOINTS]
    if (this.customEndpoint && !endpoints.includes(this.customEndpoint)) {
      endpoints.unshift(this.customEndpoint)
    }
    return endpoints.filter((endpoint) => !this.state.isCircuitOpen[endpoint])
  }

  public async createClient(): Promise<ApolloClient> {
    const endpoint = await this.getCurrentEndpoint()
    
    // Create HTTP link with the current endpoint
    const httpLink = new HttpLink({
      uri: endpoint,
    })

    // Error handling link
    const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
      if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path }) => {
          console.error(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
          )
        })
      }
      if (networkError) {
        console.error(`[Network error]: ${networkError}`)
        // Report failure to the manager
        this.reportFailure(endpoint)
      }
    })

    // Retry link with exponential backoff
    const retryLink = new RetryLink({
      delay: {
        initial: 1000,
        max: this.MAX_BACKOFF,
        jitter: true,
      },
      attempts: {
        max: DATA_SOURCE_CONFIG.GRAPHQL_MAX_RETRIES,
        retryIf: (error: any, _operation: any) => {
          // Retry on network errors or specific GraphQL errors
          return !!error && (
            error.networkError !== undefined ||
            (error.graphQLErrors && error.graphQLErrors.some((e: any) => 
              e.extensions?.code === 'UNAUTHENTICATED' ||
              e.extensions?.code === 'FORBIDDEN'
            ))
          )
        },
      },
    })

    // Context link for adding headers
    const authLink = setContext((_, context) => {
      return {
        headers: {
          'Content-Type': 'application/json',
          ...context.headers,
        }
      }
    })

    // Create the Apollo Client with properly concatenated links
    this.client = new ApolloClient({
      link: ApolloLink.from([authLink, errorLink, retryLink, httpLink]),
      cache: new InMemoryCache({
        typePolicies: {
          Query: {
            fields: {
              // Add field policies for caching optimization
              blocks: {
                merge(existing = [], incoming) {
                  return incoming
                },
              },
              transactions: {
                merge(existing = [], incoming) {
                  return incoming
                },
              },
            },
          },
        },
      }),
      defaultOptions: {
        watchQuery: {
          errorPolicy: 'all',
          fetchPolicy: 'cache-and-network',
        },
        query: {
          errorPolicy: 'all',
          fetchPolicy: 'cache-first',
        },
        mutate: {
          errorPolicy: 'all',
        },
      },
    })

    return this.client
  }

  public getClient(): ApolloClient | null {
    return this.client
  }

  public async getOrCreateClient(): Promise<ApolloClient> {
    if (!this.client) {
      return await this.createClient()
    }
    return this.client
  }

  public async switchEndpoint(newEndpoint: string): Promise<void> {
    await this.setCustomEndpoint(newEndpoint)
    // Create a new client with the new endpoint
    this.client = null
    await this.createClient()
  }

  public destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    if (this.client) {
      this.client.stop()
    }
  }

  public async setCustomEndpoint(endpoint: string): Promise<void> {
    this.customEndpoint = endpoint
    this.state.isConnected = false
  }
}

// Export a singleton instance
export const graphqlClientManager = GraphQLClientManager.getInstance()

// Export a default Apollo Client instance
export const createApolloClient = async (): Promise<ApolloClient> => {
  return await graphqlClientManager.getOrCreateClient()
}

// Export a function to get the current client
export const getApolloClient = (): ApolloClient | null => {
  return graphqlClientManager.getClient()
}
