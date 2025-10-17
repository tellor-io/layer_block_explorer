import {
  useQuery,
  ApolloQueryResult,
  DocumentNode,
  NetworkStatus,
  ApolloError,
  useApolloClient,
} from '@apollo/client'

interface UseGraphQLDataOptions {
  skip?: boolean
  pollInterval?: number
  errorPolicy?: 'none' | 'ignore' | 'all'
  fetchPolicy?:
    | 'cache-first'
    | 'cache-and-network'
    | 'network-only'
    | 'cache-only'
    | 'no-cache'
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

  // Check if Apollo Client is available
  const apolloClient = useApolloClient()

  // If Apollo Client is not available, return safe defaults
  if (!apolloClient) {
    console.warn('Apollo Client not available, returning safe defaults')
    return {
      data: undefined,
      loading: true,
      error: new ApolloError({
        errorMessage: 'Apollo Client not initialized',
        graphQLErrors: [],
        networkError: null,
      }),
      refetch: async () => {
        throw new Error('Apollo Client not initialized')
      },
      networkStatus: NetworkStatus.loading,
    }
  }

  const { data, loading, error, refetch, networkStatus } = useQuery(query, {
    variables,
    skip,
    pollInterval,
    errorPolicy,
    fetchPolicy,
    notifyOnNetworkStatusChange,
    onError: (error) => {
      console.error('GraphQL Query Error:', {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError,
        extraInfo: error.extraInfo,
      })
    },
  })

  return {
    data,
    loading,
    error,
    refetch,
    networkStatus,
  }
}
