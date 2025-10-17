# GraphQL Service Layer

## Overview

The GraphQL Service Layer (`src/services/graphqlService.ts`) is a comprehensive service that provides unified data access to the Layer Block Explorer application. It implements a primary GraphQL data source with automatic fallback to RPC and Swagger APIs when GraphQL fails.

## Architecture

### Primary Data Source: GraphQL

- Uses Apollo Client for GraphQL operations
- Implements proper error handling and retry logic
- Supports all major data types: blocks, transactions, validators, reporters, bridge data, and oracle data

### Fallback Data Sources

- **RPC Fallback**: For blockchain data (blocks, transactions) using Tendermint RPC
- **Swagger API Fallback**: For validator and reporter data using REST endpoints
- **Automatic Fallback**: Seamless switching when GraphQL fails

### Circuit Breaker Pattern

- Integrated with the Data Source Manager for health monitoring
- Automatic failover between data sources
- Health checks and performance monitoring

## Key Features

### 1. Unified Interface

All data fetching methods follow the same pattern:

```typescript
// Primary GraphQL call with automatic fallback
const data = await GraphQLService.getLatestBlock()

// Force specific data source
const data = await GraphQLService.getValidators() // Will try GraphQL first, then Swagger API
```

### 2. Error Handling

- Comprehensive error handling for GraphQL failures
- Automatic fallback to alternative data sources
- Detailed error logging and reporting
- Graceful degradation when all sources fail

### 3. Performance Optimization

- Network-only fetch policy for real-time data
- Proper caching strategies
- Request timeout handling
- Exponential backoff for retries

## Available Methods

### Block Operations

```typescript
// Get latest block with RPC fallback
const block = await GraphQLService.getLatestBlock()

// Get block by height with RPC fallback
const block = await GraphQLService.getBlockByHeight(12345)

// Get blocks with pagination and RPC fallback
const blocks = await GraphQLService.getBlocks(20, 0)

// Get block by hash with RPC fallback
const block = await GraphQLService.getBlockByHash('0x123...')
```

### Transaction Operations

```typescript
// Get transaction by hash with RPC fallback
const tx = await GraphQLService.getTransactionByHash('0xabc...')

// Get transactions with pagination and RPC fallback
const txs = await GraphQLService.getTransactions(20, 0)
```

### Validator Operations

```typescript
// Get all validators with Swagger API fallback
const validators = await GraphQLService.getValidators()

// Get validator by address with Swagger API fallback
const validator = await GraphQLService.getValidatorByAddress('cosmos1...')
```

### Reporter Operations

```typescript
// Get all reporters with Swagger API fallback
const reporters = await GraphQLService.getReporters()

// Get reporter by address with Swagger API fallback
const reporter = await GraphQLService.getReporterByAddress('cosmos1...')
```

### Bridge Operations

```typescript
// Get bridge deposits (GraphQL only - no fallback)
const deposits = await GraphQLService.getBridgeDeposits()

// Get bridge deposit by ID (GraphQL only - no fallback)
const deposit = await GraphQLService.getBridgeDepositById(123)
```

### Oracle Operations

```typescript
// Get aggregate reports (GraphQL only - no fallback)
const reports = await GraphQLService.getAggregateReports()

// Get oracle data by query ID (GraphQL only - no fallback)
const oracleData = await GraphQLService.getOracleData('query123')
```

## Fallback Implementation

### RPC Fallback for Blockchain Data

When GraphQL fails for block/transaction data, the service automatically falls back to Tendermint RPC:

```typescript
private static async getLatestBlockRPC(): Promise<GraphQLBlock> {
  const endpoint = await rpcManager.getCurrentEndpoint()
  const tmClient = await Tendermint37Client.connect(endpoint)
  const client = await StargateClient.create(tmClient)

  const block = await client.getBlock()

  // Transform RPC response to unified GraphQL format
  return {
    id: block.header.height.toString(),
    blockHeight: block.header.height.toString(),
    blockHash: block.id.hash,
    // ... other fields
  }
}
```

### Swagger API Fallback for Validators/Reporters

When GraphQL fails for validator/reporter data, the service falls back to REST endpoints:

```typescript
private static async getValidatorsSwagger(): Promise<GraphQLValidator[]> {
  const endpoint = await rpcManager.getCurrentEndpoint()
  const baseEndpoint = endpoint.replace('/rpc', '')

  const response = await fetch(`${baseEndpoint}/cosmos/staking/v1beta1/validators`)

  // Transform Swagger response to unified GraphQL format
  return data.validators.map(validator => ({
    id: validator.address,
    operatorAddress: validator.address,
    // ... other fields
  }))
}
```

## Data Transformation

### Unified Data Types

All methods return data in a consistent format regardless of the data source:

```typescript
export interface GraphQLBlock {
  id: string
  blockHeight: string
  blockHash: string
  blockTime: string
  appHash: string
  chainId: string
  consensusHash: string
  dataHash: string
  evidenceHash: string
  nextValidatorsHash: string
  validatorsHash: string
  proposerAddress: string
  numberOfTx: number
  voteExtensions?: string
}
```

### Response Format

All successful responses include metadata about the data source:

```typescript
interface FetchResult<T> {
  data: T
  source: DataSourceType // 'graphql' | 'rpc'
  responseTime: number
  cached: boolean
  fallbackUsed: boolean
}
```

## Error Handling

### GraphQL Errors

- Syntax errors, validation errors, and execution errors are caught
- Network errors trigger automatic fallback
- Detailed error logging for debugging

### Fallback Errors

- If both GraphQL and fallback fail, comprehensive error information is provided
- Error messages include details from both sources
- Circuit breaker pattern prevents cascading failures

### Timeout Handling

- Configurable request timeouts
- Automatic retry with exponential backoff
- Graceful degradation under high load

## Configuration

### Environment Variables

The service uses configuration from `src/utils/constant.ts`:

```typescript
export const GRAPHQL_ENDPOINTS = [
  'https://indexer.tellorlayer.com/graphql', // primary
  'https://backup-indexer.tellorlayer.com/graphql', // fallback
]

export const DATA_SOURCE_CONFIG = {
  PRIMARY: 'graphql',
  FALLBACK: 'rpc',
  AUTO_FALLBACK: true,
  HEALTH_CHECK_INTERVAL: 30000,
  GRAPHQL_TIMEOUT: 10000,
  GRAPHQL_MAX_RETRIES: 3,
}
```

### Custom Endpoints

Support for custom GraphQL and RPC endpoints:

```typescript
// Set custom GraphQL endpoint
await dataSourceManager.setCustomEndpoint(
  DataSourceType.GRAPHQL,
  'https://custom.com/graphql'
)

// Set custom RPC endpoint
await dataSourceManager.setCustomEndpoint(
  DataSourceType.RPC,
  'https://custom.com/rpc'
)
```

## Testing

### Test API Route

Use the test endpoint to verify service functionality:

```bash
# Test latest block fetching
GET /api/test-graphql-service?test=latest-block

# Test validators fetching
GET /api/test-graphql-service?test=validators

# Test reporters fetching
GET /api/test-graphql-service?test=reporters

# Test bridge deposits fetching
GET /api/test-graphql-service?test=bridge-deposits

# Test aggregate reports fetching
GET /api/test-graphql-service?test=aggregate-reports
```

### Manual Testing

```typescript
import { GraphQLService } from '../services/graphqlService'

// Test individual methods
try {
  const block = await GraphQLService.getLatestBlock()
  console.log('Latest block:', block)
} catch (error) {
  console.error('Failed to fetch latest block:', error)
}
```

## Performance Considerations

### Caching Strategy

- Network-only fetch policy for real-time data
- Cache-first policy for static data
- Automatic cache invalidation on endpoint switches

### Request Optimization

- Batch GraphQL queries where possible
- Efficient pagination with cursor-based navigation
- Minimal data transfer with field selection

### Monitoring

- Response time tracking for all data sources
- Error rate monitoring
- Automatic health checks
- Performance metrics collection

## Integration with Existing Code

### API Routes

The service can be easily integrated into existing API routes:

```typescript
// Before (RPC only)
export default async function handler(req, res) {
  const endpoint = await rpcManager.getCurrentEndpoint()
  const tmClient = await Tendermint37Client.connect(endpoint)
  // ... RPC implementation
}

// After (GraphQL with RPC fallback)
export default async function handler(req, res) {
  try {
    const block = await GraphQLService.getLatestBlock()
    res.status(200).json(block)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

### Components

Components can use the service directly or through custom hooks:

```typescript
// Direct usage
const [block, setBlock] = useState(null)

useEffect(() => {
  GraphQLService.getLatestBlock().then(setBlock).catch(console.error)
}, [])

// Hook-based usage (future implementation)
const { data: block, loading, error } = useGraphQLData(GET_LATEST_BLOCK)
```

## Future Enhancements

### 1. Real-time Subscriptions

- GraphQL subscriptions for live data updates
- WebSocket fallback when subscriptions fail
- Event-driven architecture for real-time components

### 2. Advanced Caching

- Redis integration for distributed caching
- Cache warming strategies
- Intelligent cache invalidation

### 3. Query Optimization

- Query batching and deduplication
- Field-level caching
- Query performance monitoring

### 4. Enhanced Monitoring

- Prometheus metrics integration
- Distributed tracing
- Performance analytics dashboard

## Troubleshooting

### Common Issues

#### 1. GraphQL Connection Failures

```typescript
// Check endpoint health
const status = dataSourceManager.getSourceStatus(DataSourceType.GRAPHQL)
console.log('GraphQL status:', status)

// Reset circuit breaker
dataSourceManager.resetCircuitBreaker(DataSourceType.GRAPHQL)
```

#### 2. Fallback Not Working

```typescript
// Verify RPC endpoint availability
const rpcEndpoint = await dataSourceManager.getRPCEndpoint()
console.log('Current RPC endpoint:', rpcEndpoint)

// Check RPC health
const rpcStatus = dataSourceManager.getSourceStatus(DataSourceType.RPC)
console.log('RPC status:', rpcStatus)
```

#### 3. Data Transformation Errors

- Verify GraphQL schema matches expected types
- Check RPC response format compatibility
- Validate data transformation logic

### Debug Mode

Enable detailed logging for troubleshooting:

```typescript
// Set debug mode in environment
DEBUG_GRAPHQL_SERVICE = true

// Or programmatically
console.log('GraphQL Service Debug Mode Enabled')
```

## Conclusion

The GraphQL Service Layer provides a robust, scalable foundation for data access in the Layer Block Explorer. It ensures high availability through intelligent fallback mechanisms while maintaining data consistency and performance. The service is designed to be easily maintainable and extensible for future requirements.

For questions or issues, refer to the main Data Source Manager documentation or contact the development team.
