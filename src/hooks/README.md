# Custom Data Fetching Hooks

This directory contains custom React hooks for data fetching with GraphQL as the primary source and RPC as fallback. **These hooks are now updated for Apollo Client 3.14.0 with enhanced capabilities.**

## Package Compatibility

**Current Version**: Apollo Client 3.14.0 (latest stable)

- **Enhanced TypeScript Support**: Better type safety and IntelliSense
- **Modern React Support**: Full compatibility with React 18
- **Performance Improvements**: Better caching and optimization
- **Active Maintenance**: Regular updates and security patches

## Available Hooks

### 1. `useGraphQLData`

Primary GraphQL hook for data fetching using Apollo Client 3.14.0.

```typescript
import { useGraphQLData } from '../hooks'
import { GET_BLOCKS } from '../graphql/queries/blocks'

function MyComponent() {
  const { data, loading, error, refetch, networkStatus } = useGraphQLData(
    GET_BLOCKS,
    { limit: 20, offset: 0 },
    { fetchPolicy: 'network-only' }
  )

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>Blocks: {data?.blocks?.length || 0}</div>
}
```

**Options:**

- `skip`: Skip the query execution
- `pollInterval`: Polling interval in milliseconds
- `errorPolicy`: Error handling policy ('none', 'ignore', 'all')
- `fetchPolicy`: Cache policy ('cache-first', 'network-only', etc.)
- `notifyOnNetworkStatusChange`: Notify on network status changes

**Return Values:**

- `data`: Query result data
- `loading`: Loading state
- `error`: ApolloError object with detailed error information
- `refetch`: Function to manually refetch data
- `networkStatus`: Network status indicator (loading, ready, error, etc.)

### 2. `useDataWithFallback`

Smart hook that tries GraphQL first, then falls back to RPC if GraphQL fails.

```typescript
import { useDataWithFallback } from '../hooks'
import { GET_BLOCKS } from '../graphql/queries/blocks'

function MyComponent() {
  const { data, loading, error, dataSource, fallbackUsed, isFallbackLoading } =
    useDataWithFallback(
      GET_BLOCKS,
      { limit: 20, offset: 0 },
      {
        enableFallback: true,
        fallbackTimeout: 5000,
      }
    )

  return (
    <div>
      <div>Data Source: {dataSource}</div>
      {fallbackUsed && <div>⚠️ Using RPC fallback</div>}
      <div>Blocks: {data?.blocks?.length || 0}</div>
    </div>
  )
}
```

**Options:**

- All `useGraphQLData` options
- `enableFallback`: Enable RPC fallback (default: true)
- `fallbackTimeout`: Timeout before attempting fallback (default: 10000ms)

**Return Values:**

- `dataSource`: 'graphql' | 'rpc' | null
- `fallbackUsed`: boolean indicating if fallback was used
- `isFallbackLoading`: boolean indicating fallback loading state
- All standard Apollo Client return values

### 3. `useRealTimeData`

Hook for real-time data via GraphQL subscriptions.

```typescript
import { useRealTimeData } from '../hooks'
import { SUBSCRIBE_TO_NEW_BLOCKS } from '../graphql/subscriptions/blocks'

function MyComponent() {
  const { data, loading, error, isSubscribed, lastUpdate, subscriptionCount } =
    useRealTimeData(SUBSCRIBE_TO_NEW_BLOCKS, undefined, {
      enableSubscription: true,
      onData: (data) => console.log('New data:', data),
      onError: (error) => console.warn('Subscription error:', error),
    })

  return (
    <div>
      <div>Subscription: {isSubscribed ? 'Active' : 'Inactive'}</div>
      <div>Updates: {subscriptionCount}</div>
      {lastUpdate && <div>Last: {lastUpdate.toLocaleTimeString()}</div>}
    </div>
  )
}
```

**Options:**

- `skip`: Skip the subscription
- `onData`: Callback when new data arrives
- `onError`: Callback when subscription errors occur
- `enableSubscription`: Enable/disable subscription
- `errorPolicy`: Error handling policy

## Migration Guide

### From Direct API Calls

**Before:**

```typescript
const [blocks, setBlocks] = useState([])
const [loading, setLoading] = useState(false)

useEffect(() => {
  const fetchBlocks = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/blocks')
      const data = await response.json()
      setBlocks(data.blocks)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }
  fetchBlocks()
}, [])
```

**After:**

```typescript
const { data, loading, error } = useDataWithFallback(GET_BLOCKS, {
  limit: 20,
  offset: 0,
})

// data.blocks contains the blocks
// loading and error are automatically handled
```

### From RPC Calls

**Before:**

```typescript
const [block, setBlock] = useState(null)

useEffect(() => {
  const fetchBlock = async () => {
    try {
      const tmClient = await Tendermint37Client.connect(endpoint)
      const block = await tmClient.getBlock(height)
      setBlock(block)
    } catch (error) {
      console.error('Error:', error)
    }
  }
  fetchBlock()
}, [height])
```

**After:**

```typescript
const { data, loading, error } = useDataWithFallback(GET_BLOCK_BY_HEIGHT, {
  height,
})

// Automatically falls back to RPC if GraphQL fails
// data.block contains the block data
```

## Error Handling

### GraphQL Error Boundary

Wrap components that use GraphQL hooks with the error boundary:

```typescript
import { GraphQLErrorBoundary } from '../components/GraphQLErrorBoundary'

function App() {
  return (
    <GraphQLErrorBoundary>
      <MyComponent />
    </GraphQLErrorBoundary>
  )
}
```

### Enhanced Error Handling with Apollo Client 3.14.0

```typescript
const { data, loading, error } = useDataWithFallback(GET_BLOCKS)

if (error) {
  // ApolloError provides detailed error information
  if (error.networkError) {
    return <div>Network error: {error.networkError.message}</div>
  }
  if (error.graphQLErrors) {
    return (
      <div>
        GraphQL errors: {error.graphQLErrors.map((e) => e.message).join(', ')}
      </div>
    )
  }
  return <div>Error: {error.message}</div>
}
```

## Best Practices

1. **Use `useDataWithFallback`** for critical data that needs fallback
2. **Use `useGraphQLData`** for non-critical data or when you want full control
3. **Use `useRealTimeData`** for live updates and real-time features
4. **Wrap components** with `GraphQLErrorBoundary` for graceful error handling
5. **Monitor data sources** using the returned `dataSource` and `fallbackUsed` values
6. **Handle loading states** for both primary and fallback data sources
7. **Leverage Apollo Client 3.14.0 features** like enhanced caching and error handling

## Performance Considerations

- Use appropriate `fetchPolicy` values based on data freshness requirements
- Enable fallback only when necessary to avoid unnecessary RPC calls
- Use `pollInterval` sparingly and prefer subscriptions for real-time data
- Monitor subscription performance and disable if causing issues
- Take advantage of Apollo Client's built-in caching and optimization

## New Features in Apollo Client 3.14.0

### Enhanced TypeScript Support

- Better type inference for query results
- Improved error typing with `ApolloError`
- Network status enumeration with `NetworkStatus`

### Improved Error Handling

- Detailed error information with `graphQLErrors` and `networkError`
- Better error categorization and handling
- Enhanced error recovery mechanisms

### Performance Improvements

- Better cache management and optimization
- Improved network request handling
- Enhanced subscription management

## Troubleshooting

### Common Issues

1. **Type Errors**: Ensure you're using the correct types from `@apollo/client`
2. **Network Errors**: Check GraphQL endpoint availability and configuration
3. **Cache Issues**: Use appropriate `fetchPolicy` values for your use case
4. **Subscription Problems**: Verify WebSocket endpoint configuration

### Debug Mode

Enable Apollo Client debug mode for troubleshooting:

```typescript
// In your Apollo Client configuration
const client = new ApolloClient({
  // ... other options
  connectToDevTools: process.env.NODE_ENV === 'development',
})
```

### Performance Monitoring

Monitor Apollo Client performance:

```typescript
// Track query performance
const { data, loading, error, networkStatus } = useGraphQLData(
  query,
  variables,
  {
    notifyOnNetworkStatusChange: true,
  }
)

// networkStatus values:
// 1: loading, 2: setVariables, 3: fetchMore, 4: refetch, 5: poll, 6: ready, 7: error
```
