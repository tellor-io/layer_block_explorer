import { useSelector, useDispatch } from 'react-redux'
import { AppState } from '../store/types'
import {
  selectGraphQLConnection,
  selectGraphQLQueryCache,
  selectGraphQLErrors,
  selectGraphQLPerformance,
  selectDataSourcePriority,
  selectFallbackUsage,
  selectIsGraphQLConnected,
  selectCurrentGraphQLEndpoint,
  selectGraphQLHealthStatus,
  selectQueryCacheStats,
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
} from '../store/graphqlSlice'

/**
 * Custom hook for accessing and managing GraphQL store state
 * Provides easy access to all GraphQL-related state and actions
 */
export const useGraphQLStore = () => {
  const dispatch = useDispatch()

  // Selectors
  const connection = useSelector(selectGraphQLConnection)
  const queryCache = useSelector(selectGraphQLQueryCache)
  const errors = useSelector(selectGraphQLErrors)
  const performance = useSelector(selectGraphQLPerformance)
  const dataSourcePriority = useSelector(selectDataSourcePriority)
  const fallbackUsage = useSelector(selectFallbackUsage)
  const isConnected = useSelector(selectIsGraphQLConnected)
  const currentEndpoint = useSelector(selectCurrentGraphQLEndpoint)
  const healthStatus = useSelector(selectGraphQLHealthStatus)
  const cacheStats = useSelector(selectQueryCacheStats)

  // Actions
  const actions = {
    // Connection management
    setConnectionStatus: (status: Partial<typeof connection>) => 
      dispatch(setConnectionStatus(status)),
    setEndpointStatus: (endpoint: string, isOpen: boolean) => 
      dispatch(setEndpointStatus({ endpoint, isOpen })),
    updateHealthCheck: (timestamp: number) => 
      dispatch(updateHealthCheck(timestamp)),

    // Query cache management
    setQueryCache: (key: string, data: any, error?: string) => 
      dispatch(setQueryCache({ key, data, error })),
    setQueryLoading: (key: string, loading: boolean) => 
      dispatch(setQueryLoading({ key, loading })),
    clearQueryCache: (key?: string) => 
      dispatch(clearQueryCache(key)),

    // Error handling
    setGraphQLError: (error: string, query: string, endpoint: string) => 
      dispatch(setGraphQLError({ error, query, endpoint })),
    clearErrors: () => dispatch(clearErrors()),

    // Performance tracking
    recordQueryTime: (queryTime: number, query: string) => 
      dispatch(recordQueryTime({ queryTime, query })),
    recordQueryFailure: (query: string) => 
      dispatch(recordQueryFailure({ query })),
    updateCacheHitRate: (rate: number) => 
      dispatch(updateCacheHitRate(rate)),

    // Data source management
    setDataSourcePriority: (priority: 'graphql' | 'rpc') => 
      dispatch(setDataSourcePriority(priority)),
    recordFallback: (reason: string, endpoint: string) => 
      dispatch(recordFallback({ reason, endpoint })),

    // Reset
    resetGraphQLState: () => dispatch(resetGraphQLState()),
  }

  return {
    // State
    connection,
    queryCache,
    errors,
    performance,
    dataSourcePriority,
    fallbackUsage,
    isConnected,
    currentEndpoint,
    healthStatus,
    cacheStats,

    // Actions
    actions,
  }
}

export default useGraphQLStore
