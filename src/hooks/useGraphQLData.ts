import { useQuery, ApolloQueryResult, DocumentNode, NetworkStatus, ApolloError } from '@apollo/client'

interface UseGraphQLDataOptions {
  skip?: boolean
  pollInterval?: number
  errorPolicy?: 'none' | 'ignore' | 'all'
  fetchPolicy?: 'cache-first' | 'cache-and-network' | 'network-only' | 'cache-only' | 'no-cache'
  notifyOnNetworkStatusChange?: boolean
}

interface UseGraphQLDataReturn<T> {
  data: T | undefined
  loading: boolean
  error: ApolloError | undefined
  refetch: (variables?: any) => Promise<ApolloQueryResult<T>>
  networkStatus: NetworkStatus
}

/**
 * Primary GraphQL hook for data fetching
 * Uses Apollo Client 3.14.0 for GraphQL operations with comprehensive options
 */
export function useGraphQLData<T = any>(
  query: DocumentNode,
  variables?: any,
  options: UseGraphQLDataOptions = {}
): UseGraphQLDataReturn<T> {
  const {
    skip = false,
    pollInterval,
    errorPolicy = 'none',
    fetchPolicy = 'cache-first',
    notifyOnNetworkStatusChange = false,
  } = options

  const { data, loading, error, refetch, networkStatus } = useQuery(query, {
    variables,
    skip,
    pollInterval,
    errorPolicy,
    fetchPolicy,
    notifyOnNetworkStatusChange,
  })

  return {
    data,
    loading,
    error,
    refetch,
    networkStatus,
  }
}
