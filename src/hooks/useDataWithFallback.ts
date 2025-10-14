import { useState, useEffect, useCallback } from 'react'
import { useQuery, ApolloQueryResult, DocumentNode, NetworkStatus, ApolloError } from '@apollo/client'
import { GraphQLService } from '../services/graphqlService'

interface UseDataWithFallbackOptions {
  skip?: boolean
  pollInterval?: number
  errorPolicy?: 'none' | 'ignore' | 'all'
  fetchPolicy?: 'cache-first' | 'cache-and-network' | 'network-only' | 'cache-only' | 'no-cache'
  notifyOnNetworkStatusChange?: boolean
  enableFallback?: boolean
  fallbackTimeout?: number
}

interface UseDataWithFallbackReturn<T> {
  data: T | undefined
  loading: boolean
  error: ApolloError | undefined
  refetch: (variables?: any) => Promise<ApolloQueryResult<T>>
  networkStatus: NetworkStatus
  dataSource: 'graphql' | 'rpc' | null
  fallbackUsed: boolean
  isFallbackLoading: boolean
}

/**
 * Hook with RPC fallback for data fetching
 * Tries GraphQL first, falls back to RPC if GraphQL fails
 * Uses Apollo Client 3.14.0 with enhanced fallback capabilities
 */
export function useDataWithFallback<T = any>(
  query: DocumentNode,
  variables?: any,
  options: UseDataWithFallbackOptions = {}
): UseDataWithFallbackReturn<T> {
  const {
    skip = false,
    pollInterval,
    errorPolicy = 'none',
    fetchPolicy = 'cache-first',
    notifyOnNetworkStatusChange = false,
    enableFallback = true,
    fallbackTimeout = 10000,
  } = options

  const [fallbackData, setFallbackData] = useState<T | undefined>(undefined)
  const [fallbackError, setFallbackError] = useState<ApolloError | undefined>(undefined)
  const [isFallbackLoading, setIsFallbackLoading] = useState(false)
  const [dataSource, setDataSource] = useState<'graphql' | 'rpc' | null>(null)
  const [fallbackUsed, setFallbackUsed] = useState(false)

  // GraphQL query using Apollo Client
  const { data, loading, error, refetch, networkStatus } = useQuery(query, {
    variables,
    skip,
    pollInterval,
    errorPolicy,
    fetchPolicy,
    notifyOnNetworkStatusChange,
  })

  // Extract query name to determine which fallback method to use
  const getQueryName = (query: DocumentNode): string => {
    if (query.definitions[0]?.kind === 'OperationDefinition') {
      return (query.definitions[0] as any)?.name?.value || 'unknown'
    }
    return 'unknown'
  }

  // Fallback function that tries to get data from RPC
  const attemptFallback = useCallback(async () => {
    if (!enableFallback) return

    try {
      setIsFallbackLoading(true)
      setFallbackError(undefined)

      const queryName = getQueryName(query)
      let fallbackResult: any

      switch (queryName) {
        case 'GetBlocks':
          fallbackResult = await GraphQLService.getBlocks(variables?.limit || 20, variables?.offset || 0)
          break
        case 'GetBlockByHeight':
          fallbackResult = await GraphQLService.getBlockByHeight(variables?.height || 0)
          break
        case 'GetValidators':
          fallbackResult = await GraphQLService.getValidators()
          break
        case 'GetReporters':
          fallbackResult = await GraphQLService.getReporters()
          break
        case 'GetLatestBlock':
          fallbackResult = await GraphQLService.getLatestBlock()
          break
        default:
          console.warn('Unknown query type for fallback, using generic approach')
          return
      }

      setFallbackData(fallbackResult)
      setDataSource('rpc')
      setFallbackUsed(true)
      setFallbackError(undefined)
    } catch (fallbackErr) {
      console.error('Fallback failed:', fallbackErr)
      const apolloError = new ApolloError({
        networkError: fallbackErr instanceof Error ? fallbackErr : new Error('Fallback failed'),
        errorMessage: 'Fallback data source failed'
      })
      setFallbackError(apolloError)
      setDataSource(null)
    } finally {
      setIsFallbackLoading(false)
    }
  }, [enableFallback, query, variables])

  // Attempt fallback when GraphQL fails
  useEffect(() => {
    if (error && enableFallback && !fallbackData && !isFallbackLoading) {
      const timeoutId = setTimeout(attemptFallback, fallbackTimeout)
      return () => clearTimeout(timeoutId)
    }
  }, [error, enableFallback, fallbackData, isFallbackLoading, attemptFallback, fallbackTimeout])

  // Set data source when GraphQL succeeds
  useEffect(() => {
    if (data && !error) {
      setDataSource('graphql')
      setFallbackUsed(false)
    }
  }, [data, error])

  // Determine which data to return
  const finalData = data || fallbackData
  const finalLoading = loading || isFallbackLoading
  const finalError = error || fallbackError

  return {
    data: finalData,
    loading: finalLoading,
    error: finalError,
    refetch,
    networkStatus,
    dataSource,
    fallbackUsed,
    isFallbackLoading,
  }
}
