# Phase 6: Real-time Updates Implementation

## Overview

Phase 6 implements comprehensive real-time data updates using GraphQL subscriptions with automatic fallback to polling when subscriptions fail. This provides a robust, resilient real-time data system for the Layer Block Explorer.

## Key Features

### ✅ GraphQL Subscriptions

- **Real-time Block Updates**: Automatic subscription to new blocks
- **Transaction Monitoring**: Real-time transaction event subscriptions
- **Validator Updates**: Live validator status and power changes
- **Reporter Activity**: Real-time reporter status and activity updates

### ✅ Advanced Stream Management

- **Enhanced Redux Store**: Comprehensive subscription state tracking
- **Health Monitoring**: Real-time subscription health and error tracking
- **Automatic Fallback**: Seamless polling fallback when subscriptions fail
- **Reconnection Logic**: Smart reconnection with exponential backoff

### ✅ Custom Hooks

- **useRealTimeBlocks**: Real-time block updates with deduplication
- **useRealTimeTransactions**: Live transaction monitoring with filtering
- **useRealTimeValidators**: Validator status and power updates
- **useRealTimeReporters**: Reporter activity and status monitoring
- **useRealTimeData**: Unified real-time data management
- **useSubscriptionManager**: Advanced subscription lifecycle management

## Implementation Details

### GraphQL Subscriptions

#### Block Subscriptions (`src/graphql/subscriptions/blocks.ts`)

```typescript
// Subscribe to new blocks in real-time
export const SUBSCRIBE_TO_NEW_BLOCKS = gql`
  subscription SubscribeToNewBlocks {
    newBlock {
      ...BlockFields
    }
  }
`

// Subscribe to blocks with specific criteria
export const SUBSCRIBE_TO_BLOCKS_BY_CRITERIA = gql`
  subscription SubscribeToBlocksByCriteria($minHeight: BigInt!) {
    newBlock(where: { blockHeight_gte: $minHeight }) {
      ...BlockFields
    }
  }
`
```

#### Transaction Subscriptions (`src/graphql/subscriptions/transactions.ts`)

```typescript
// Subscribe to new transactions in real-time
export const SUBSCRIBE_TO_NEW_TRANSACTIONS = gql`
  subscription SubscribeToNewTransactions {
    newTransaction {
      ...TransactionFields
    }
  }
`

// Subscribe to transactions by block height
export const SUBSCRIBE_TO_TRANSACTIONS_BY_BLOCK = gql`
  subscription SubscribeToTransactionsByBlock($blockHeight: BigInt!) {
    newTransaction(where: { blockHeight_eq: $blockHeight }) {
      ...TransactionFields
    }
  }
`
```

#### Validator Subscriptions (`src/graphql/subscriptions/validators.ts`)

```typescript
// Subscribe to validator updates in real-time
export const SUBSCRIBE_TO_VALIDATOR_UPDATES = gql`
  subscription SubscribeToValidatorUpdates {
    validatorUpdate {
      ...ValidatorFields
    }
  }
`

// Subscribe to validator status changes
export const SUBSCRIBE_TO_VALIDATOR_STATUS_CHANGES = gql`
  subscription SubscribeToValidatorStatusChanges {
    validatorStatusChange {
      ...ValidatorBasicFields
    }
  }
`
```

#### Reporter Subscriptions (`src/graphql/subscriptions/reporters.ts`)

```typescript
// Subscribe to reporter updates in real-time
export const SUBSCRIBE_TO_REPORTER_UPDATES = gql`
  subscription SubscribeToReporterUpdates {
    reporterUpdate {
      ...ReporterFields
    }
  }
`

// Subscribe to new reporter registrations
export const SUBSCRIBE_TO_NEW_REPORTERS = gql`
  subscription SubscribeToNewReporters {
    newReporter {
      ...ReporterFields
    }
  }
`
```

### Enhanced Stream Management

#### Redux Store Updates (`src/store/streamSlice.ts`)

```typescript
export interface StreamState {
  // ... existing fields ...

  // GraphQL subscription status tracking
  subscriptionStatus: {
    blocks: 'connected' | 'disconnected' | 'error' | 'connecting'
    transactions: 'connected' | 'disconnected' | 'error' | 'connecting'
    validators: 'connected' | 'disconnected' | 'error' | 'connecting'
    reporters: 'connected' | 'disconnected' | 'error' | 'connecting'
  }

  // Subscription error tracking
  subscriptionErrors: {
    blocks: string | null
    transactions: string | null
    validators: string | null
    reporters: string | null
  }

  // Fallback polling state
  pollingState: {
    enabled: boolean
    intervals: {
      blocks: NodeJS.Timeout | null
      transactions: NodeJS.Timeout | null
      validators: NodeJS.Timeout | null
      reporters: NodeJS.Timeout | null
    }
  }
}
```

#### New Actions and Selectors

```typescript
// Actions
setSubscriptionStatus({ type, status })
setSubscriptionError({ type, error })
setPollingEnabled(enabled)
setPollingInterval({ type, interval })
clearAllSubscriptionErrors()
resetAllSubscriptions()

// Selectors
selectSubscriptionStatus(state)
selectSubscriptionErrors(state)
selectPollingState(state)
selectAnySubscriptionConnected(state)
selectAnySubscriptionError(state)
selectSubscriptionHealth(state)
```

### Custom Hooks

#### Real-time Data Hooks

```typescript
// Real-time blocks with deduplication
const blocks = useRealTimeBlocks({
  limit: 20,
  offset: 0,
  enableSubscription: true,
})

// Real-time transactions with filtering
const transactions = useRealTimeTransactions({
  limit: 20,
  offset: 0,
  enableSubscription: true,
  blockHeight: 12345, // optional filter
})

// Real-time validators with status filtering
const validators = useRealTimeValidators({
  enableSubscription: true,
  bondStatus: 'BOND_STATUS_BONDED', // optional filter
})

// Real-time reporters with status filtering
const reporters = useRealTimeReporters({
  enableSubscription: true,
  jailed: false, // optional filter
})
```

#### Unified Real-time Management

```typescript
// Comprehensive real-time data management
const realTimeData = useRealTimeData({
  enableSubscriptions: true,
  enablePolling: true,
  pollingInterval: 30000, // 30 seconds
  dataTypes: ['blocks', 'transactions', 'validators', 'reporters'],
})

// Advanced subscription management
const subscriptionManager = useSubscriptionManager({
  enableAutoReconnect: true,
  reconnectDelay: 5000,
  maxReconnectAttempts: 5,
  enablePollingFallback: true,
})
```

## Usage Examples

### Basic Real-time Block Updates

```typescript
import { useRealTimeBlocks } from '../hooks'

function BlocksPage() {
  const { blocks, isLoading, error, refetch } = useRealTimeBlocks({
    limit: 20,
    enableSubscription: true,
  })

  if (isLoading) return <div>Loading blocks...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h1>Real-time Blocks</h1>
      <button onClick={refetch}>Refresh</button>
      {blocks.map((block) => (
        <div key={block.blockHeight}>
          Block {block.blockHeight}: {block.blockHash}
        </div>
      ))}
    </div>
  )
}
```

### Advanced Subscription Management

```typescript
import { useRealTimeData, useSubscriptionManager } from '../hooks'

function RealTimeDashboard() {
  const realTimeData = useRealTimeData({
    enableSubscriptions: true,
    enablePolling: true,
    dataTypes: ['blocks', 'transactions', 'validators', 'reporters'],
  })

  const subscriptionManager = useSubscriptionManager({
    enableAutoReconnect: true,
    maxReconnectAttempts: 5,
  })

  const handleReconnect = () => {
    subscriptionManager.reconnectAll()
  }

  const handleClearErrors = () => {
    realTimeData.clearErrors()
  }

  return (
    <div>
      <div>Health: {realTimeData.healthPercentage}%</div>
      <div>Connected: {realTimeData.isConnected ? 'Yes' : 'No'}</div>
      <div>Has Errors: {realTimeData.hasErrors ? 'Yes' : 'No'}</div>

      <button onClick={handleReconnect}>Reconnect All</button>
      <button onClick={handleClearErrors}>Clear Errors</button>
    </div>
  )
}
```

### Error Handling and Fallback

```typescript
import { useRealTimeBlocks } from '../hooks'

function ResilientBlocksPage() {
  const { blocks, isLoading, error } = useRealTimeBlocks({
    limit: 20,
    enableSubscription: true,
  })

  // Automatic fallback to polling is handled by the hook
  // No additional error handling needed for subscription failures

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {blocks.map((block) => (
        <div key={block.blockHeight}>Block {block.blockHeight}</div>
      ))}
    </div>
  )
}
```

## Key Benefits

### 🚀 Performance

- **Efficient Subscriptions**: Real-time updates without polling overhead
- **Smart Deduplication**: Prevents duplicate data from subscription updates
- **Configurable Limits**: Maintains data limits and memory efficiency
- **Automatic Cleanup**: Cleans up old data beyond configured limits

### 🛡️ Reliability

- **Automatic Fallback**: Seamless polling when subscriptions fail
- **Error Resilience**: Non-blocking subscription errors
- **Reconnection Logic**: Smart reconnection with exponential backoff
- **Health Monitoring**: Real-time subscription health tracking

### 🔧 Developer Experience

- **Simple API**: Easy-to-use hooks with sensible defaults
- **TypeScript Support**: Full type safety throughout
- **Comprehensive State**: Rich subscription state and health information
- **Flexible Configuration**: Configurable limits, filters, and behavior

### 📊 Monitoring

- **Health Metrics**: Real-time subscription health percentages
- **Error Tracking**: Detailed error information and history
- **Status Monitoring**: Connection status for each data type
- **Performance Insights**: Subscription performance and success rates

## Migration Guide

### From RPC WebSocket to GraphQL Subscriptions

#### Before (RPC WebSocket)

```typescript
// Old RPC WebSocket approach
const rpcClient = new RpcClient()
const subscription = rpcClient.subscribe('newBlock', (block) => {
  setBlocks((prev) => [block, ...prev.slice(0, 19)])
})
```

#### After (GraphQL Subscriptions)

```typescript
// New GraphQL subscription approach
const { blocks, isLoading, error } = useRealTimeBlocks({
  limit: 20,
  enableSubscription: true,
})
```

### Benefits of Migration

- **Better Error Handling**: Comprehensive error tracking and recovery
- **Automatic Fallback**: Built-in polling fallback when subscriptions fail
- **Type Safety**: Full TypeScript support with GraphQL schema types
- **Performance**: More efficient data fetching and caching
- **Monitoring**: Rich health and status information

## Troubleshooting

### Common Issues

#### Subscriptions Not Connecting

```typescript
// Check subscription status
const subscriptionStatus = useSelector(selectSubscriptionStatus)
console.log('Subscription status:', subscriptionStatus)

// Reconnect if needed
const subscriptionManager = useSubscriptionManager()
subscriptionManager.reconnectAll()
```

#### Polling Fallback Not Working

```typescript
// Enable polling fallback
const realTimeData = useRealTimeData({
  enablePolling: true,
  pollingInterval: 30000,
})

// Check polling state
const pollingState = useSelector(selectPollingState)
console.log('Polling enabled:', pollingState.enabled)
```

#### Memory Leaks

```typescript
// Ensure proper cleanup
useEffect(() => {
  return () => {
    // Hooks handle cleanup automatically
    // No manual cleanup needed
  }
}, [])
```

### Debug Information

```typescript
// Get comprehensive health information
const health = useSelector(selectSubscriptionHealth)
console.log('Health:', {
  connectedCount: health.connectedCount,
  totalCount: health.totalCount,
  healthPercentage: health.healthPercentage,
  hasErrors: health.hasErrors,
  isHealthy: health.isHealthy,
})
```

## Future Enhancements

### Planned Features

- **WebSocket Compression**: Reduce bandwidth usage for large datasets
- **Selective Subscriptions**: Subscribe only to specific data types
- **Custom Filters**: More granular subscription filtering
- **Performance Metrics**: Detailed performance monitoring and analytics
- **Batch Updates**: Efficient handling of multiple simultaneous updates

### Integration Opportunities

- **Real-time Notifications**: Browser notifications for important events
- **Data Visualization**: Real-time charts and graphs
- **Collaborative Features**: Multi-user real-time updates
- **Offline Support**: Graceful handling of network disconnections

## Conclusion

Phase 6 provides a robust, scalable real-time data system that significantly improves the user experience while maintaining reliability and performance. The implementation includes comprehensive error handling, automatic fallback mechanisms, and extensive monitoring capabilities.

The system is designed to be:

- **Resilient**: Handles failures gracefully with automatic recovery
- **Performant**: Efficient data fetching and memory management
- **Maintainable**: Clean, well-documented code with comprehensive TypeScript support
- **Extensible**: Easy to add new data types and subscription patterns

This implementation sets the foundation for advanced real-time features and provides a solid base for future enhancements.
