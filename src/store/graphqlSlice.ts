import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit'
import { AppState } from './types'
import { HYDRATE } from 'next-redux-wrapper'

// Types for GraphQL state
export interface GraphQLConnectionStatus {
  isConnected: boolean
  currentEndpoint: string
  availableEndpoints: string[]
  lastHealthCheck: number
  circuitBreakerStatus: { [endpoint: string]: boolean }
}

export interface GraphQLQueryCache {
  [queryKey: string]: {
    timestamp: number
    data: any
    error: string | null
    loading: boolean
    lastFetched: number
    fetchCount: number
  }
}

export interface GraphQLErrorState {
  lastError: string | null
  errorCount: number
  lastErrorTime: number
  errorHistory: Array<{
    timestamp: number
    error: string
    query: string
    endpoint: string
  }>
}

export interface GraphQLPerformanceMetrics {
  averageQueryTime: number
  totalQueries: number
  successfulQueries: number
  failedQueries: number
  cacheHitRate: number
  lastQueryTime: number
  queryTimeHistory: Array<{
    timestamp: number
    queryTime: number
    query: string
  }>
}

export interface GraphQLState {
  connection: GraphQLConnectionStatus
  queryCache: GraphQLQueryCache
  errors: GraphQLErrorState
  performance: GraphQLPerformanceMetrics
  dataSourcePriority: 'graphql' | 'rpc'
  fallbackUsage: {
    totalFallbacks: number
    lastFallbackTime: number
    fallbackReasons: Array<{
      timestamp: number
      reason: string
      endpoint: string
    }>
  }
}

// Initial state
const initialState: GraphQLState = {
  connection: {
    isConnected: false,
    currentEndpoint: '',
    availableEndpoints: [],
    lastHealthCheck: 0,
    circuitBreakerStatus: {},
  },
  queryCache: {},
  errors: {
    lastError: null,
    errorCount: 0,
    lastErrorTime: 0,
    errorHistory: [],
  },
  performance: {
    averageQueryTime: 0,
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    cacheHitRate: 0,
    lastQueryTime: 0,
    queryTimeHistory: [],
  },
  dataSourcePriority: 'graphql',
  fallbackUsage: {
    totalFallbacks: 0,
    lastFallbackTime: 0,
    fallbackReasons: [],
  },
}

// Define a type for the HYDRATE action
type HydrateAction = Action<typeof HYDRATE> & {
  payload: AppState
}

// Actual Slice
export const graphqlSlice = createSlice({
  name: 'graphql',
  initialState,
  reducers: {
    // Connection status actions
    setConnectionStatus(state, action: PayloadAction<Partial<GraphQLConnectionStatus>>) {
      state.connection = { ...state.connection, ...action.payload }
    },
    setEndpointStatus(state, action: PayloadAction<{ endpoint: string; isOpen: boolean }>) {
      state.connection.circuitBreakerStatus[action.payload.endpoint] = action.payload.isOpen
    },
    updateHealthCheck(state, action: PayloadAction<number>) {
      state.connection.lastHealthCheck = action.payload
    },

    // Query cache actions
    setQueryCache(state, action: PayloadAction<{ key: string; data: any; error?: string }>) {
      const { key, data, error } = action.payload
      const existing = state.queryCache[key] || { fetchCount: 0, loading: false }
      
      state.queryCache[key] = {
        timestamp: Date.now(),
        data,
        error: error || null,
        loading: false,
        lastFetched: Date.now(),
        fetchCount: existing.fetchCount + 1,
      }
    },
    setQueryLoading(state, action: PayloadAction<{ key: string; loading: boolean }>) {
      const { key, loading } = action.payload
      if (state.queryCache[key]) {
        state.queryCache[key].loading = loading
      } else {
        state.queryCache[key] = {
          timestamp: Date.now(),
          data: null,
          error: null,
          loading,
          lastFetched: 0,
          fetchCount: 0,
        }
      }
    },
    clearQueryCache(state, action: PayloadAction<string | undefined>) {
      if (action.payload) {
        delete state.queryCache[action.payload]
      } else {
        state.queryCache = {}
      }
    },

    // Error handling actions
    setGraphQLError(state, action: PayloadAction<{ error: string; query: string; endpoint: string }>) {
      const { error, query, endpoint } = action.payload
      state.errors.lastError = error
      state.errors.errorCount += 1
      state.errors.lastErrorTime = Date.now()
      
      // Keep only last 50 errors in history
      state.errors.errorHistory = [
        { timestamp: Date.now(), error, query, endpoint },
        ...state.errors.errorHistory.slice(0, 49),
      ]
    },
    clearErrors(state) {
      state.errors.lastError = null
      state.errors.errorCount = 0
      state.errors.errorHistory = []
    },

    // Performance tracking actions
    recordQueryTime(state, action: PayloadAction<{ queryTime: number; query: string }>) {
      const { queryTime, query } = action.payload
      state.performance.totalQueries += 1
      state.performance.successfulQueries += 1
      state.performance.lastQueryTime = queryTime
      
      // Update average query time
      const totalTime = state.performance.averageQueryTime * (state.performance.totalQueries - 1) + queryTime
      state.performance.averageQueryTime = totalTime / state.performance.totalQueries
      
      // Keep only last 100 query times in history
      state.performance.queryTimeHistory = [
        { timestamp: Date.now(), queryTime, query },
        ...state.performance.queryTimeHistory.slice(0, 99),
      ]
    },
    recordQueryFailure(state, action: PayloadAction<{ query: string }>) {
      state.performance.totalQueries += 1
      state.performance.failedQueries += 1
    },
    updateCacheHitRate(state, action: PayloadAction<number>) {
      state.performance.cacheHitRate = action.payload
    },

    // Data source management actions
    setDataSourcePriority(state, action: PayloadAction<'graphql' | 'rpc'>) {
      state.dataSourcePriority = action.payload
    },
    recordFallback(state, action: PayloadAction<{ reason: string; endpoint: string }>) {
      const { reason, endpoint } = action.payload
      state.fallbackUsage.totalFallbacks += 1
      state.fallbackUsage.lastFallbackTime = Date.now()
      
      // Keep only last 50 fallback reasons
      state.fallbackUsage.fallbackReasons = [
        { timestamp: Date.now(), reason, endpoint },
        ...state.fallbackUsage.fallbackReasons.slice(0, 49),
      ]
    },

    // Reset actions
    resetGraphQLState(state) {
      state.queryCache = {}
      state.errors = {
        lastError: null,
        errorCount: 0,
        lastErrorTime: 0,
        errorHistory: [],
      }
      state.performance = {
        averageQueryTime: 0,
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        cacheHitRate: 0,
        lastQueryTime: 0,
        queryTimeHistory: [],
      }
      state.fallbackUsage = {
        totalFallbacks: 0,
        lastFallbackTime: 0,
        fallbackReasons: [],
      }
    },
  },

  // Special reducer for hydrating the state. Special case for next-redux-wrapper
  extraReducers: (builder) => {
    builder.addCase(HYDRATE, (state, action: HydrateAction) => {
      return {
        ...state,
        ...action.payload.graphql,
      }
    })
  },
})

export const {
  setConnectionStatus,
  setEndpointStatus,
  updateHealthCheck,
  setQueryCache,
  setQueryLoading,
  clearQueryCache,
  setGraphQLError,
  clearErrors,
  recordQueryTime,
  recordQueryFailure,
  updateCacheHitRate,
  setDataSourcePriority,
  recordFallback,
  resetGraphQLState,
} = graphqlSlice.actions

// Selectors
export const selectGraphQLConnection = (state: AppState) => state.graphql.connection
export const selectGraphQLQueryCache = (state: AppState) => state.graphql.queryCache
export const selectGraphQLErrors = (state: AppState) => state.graphql.errors
export const selectGraphQLPerformance = (state: AppState) => state.graphql.performance
export const selectDataSourcePriority = (state: AppState) => state.graphql.dataSourcePriority
export const selectFallbackUsage = (state: AppState) => state.graphql.fallbackUsage

// Derived selectors
export const selectIsGraphQLConnected = (state: AppState) => state.graphql.connection.isConnected
export const selectCurrentGraphQLEndpoint = (state: AppState) => state.graphql.connection.currentEndpoint
export const selectGraphQLHealthStatus = (state: AppState) => {
  const { lastHealthCheck, isConnected } = state.graphql.connection
  const timeSinceLastCheck = Date.now() - lastHealthCheck
  return {
    isConnected,
    lastHealthCheck,
    timeSinceLastCheck,
    isHealthy: timeSinceLastCheck < 60000, // Consider healthy if checked within last minute
  }
}
export const selectQueryCacheStats = (state: AppState) => {
  const cache = state.graphql.queryCache
  const totalCached = Object.keys(cache).length
  const activeQueries = Object.values(cache).filter(q => q.loading).length
  const recentQueries = Object.values(cache).filter(q => Date.now() - q.lastFetched < 300000).length // Last 5 minutes
  
  return {
    totalCached,
    activeQueries,
    recentQueries,
    cacheKeys: Object.keys(cache),
  }
}

export default graphqlSlice.reducer
