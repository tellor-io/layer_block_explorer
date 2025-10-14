# Unified Data Source Manager

This document describes the unified data source manager implementation for Step 1.3 of the GraphQL indexer migration plan.

## Overview

The `DataSourceManager` provides a unified interface for fetching data from both GraphQL and RPC sources with automatic fallback, circuit breaker patterns, and health monitoring.

## Key Features

### 1. Automatic Fallback
- Primary data source: GraphQL
- Fallback data source: RPC
- Automatic switching when primary source fails
- Configurable fallback behavior

### 2. Circuit Breaker Pattern
- Prevents cascading failures
- Automatic circuit opening after configurable failure threshold
- Circuit reset after configurable timeout
- Health checks to restore circuits

### 3. Health Monitoring
- Continuous health checks for both data sources
- Response time tracking
- Failure count monitoring
- Real-time status reporting

### 4. Unified Interface
- Single API for all data fetching operations
- Consistent error handling
- Performance metrics
- Source transparency

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │ DataSourceManager│    │   GraphQL/RPC   │
│                 │    │                 │    │   Managers      │
│ - Components    │───▶│ - Fallback Logic│───▶│ - Endpoint Mgmt │
│ - API Routes    │    │ - Circuit Breaker│    │ - Health Checks │
│ - Services      │    │ - Health Monitor│    │ - Retry Logic   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Usage Examples

### Basic Usage

```typescript
import { fetchWithFallback, DataSourceType } from './dataSourceManager'

// Fetch data with automatic fallback
const result = await fetchWithFallback(
  async (source: DataSourceType) => {
    if (source === DataSourceType.GRAPHQL) {
      return await fetchFromGraphQL()
    } else {
      return await fetchFromRPC()
    }
  },
  {
    timeout: 10000,
    retries: 3,
    fallbackOnError: true
  }
)

console.log(`Data fetched from: ${result.source}`)
console.log(`Response time: ${result.responseTime}ms`)
console.log(`Fallback used: ${result.fallbackUsed}`)
```

### Using the Unified Data Service

```typescript
import { UnifiedDataService } from './unifiedDataService'

// Fetch latest block
const latestBlock = await UnifiedDataService.getLatestBlock({
  timeout: 10000,
  retries: 2
})

// Fetch block by height
const block = await UnifiedDataService.getBlockByHeight(12345, {
  timeout: 10000,
  retries: 2
})

// Fetch validators
const validators = await UnifiedDataService.getValidators({
  timeout: 15000,
  retries: 3
})
```

### API Route Integration

```typescript
// src/pages/api/blocks/[height].ts
import { UnifiedDataService } from '../../../utils/unifiedDataService'

export default async function handler(req, res) {
  try {
    const { height } = req.query
    
    const result = await UnifiedDataService.getBlockByHeight(Number(height), {
      timeout: 10000,
      retries: 2,
      fallbackOnError: true
    })
    
    return res.status(200).json({
      data: result.data,
      metadata: {
        source: result.source,
        responseTime: result.responseTime,
        fallbackUsed: result.fallbackUsed
      }
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
```

## Configuration

### Environment Variables

```typescript
// src/utils/constant.ts
export const DATA_SOURCE_CONFIG = {
  PRIMARY: 'graphql',
  FALLBACK: 'rpc',
  AUTO_FALLBACK: true,
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  GRAPHQL_TIMEOUT: 10000,       // 10 seconds
  GRAPHQL_MAX_RETRIES: 3,
}
```

### Runtime Configuration

```typescript
import { dataSourceManager } from './dataSourceManager'

// Update configuration at runtime
dataSourceManager.updateConfig({
  healthCheckInterval: 60000, // 1 minute
  maxFailures: 3,
  circuitResetTime: 120000 // 2 minutes
})
```

## Monitoring and Status

### Get Data Source Status

```typescript
import { getDataSourceStatus, DataSourceType } from './dataSourceManager'

const status = getDataSourceStatus()
const graphqlStatus = status.get(DataSourceType.GRAPHQL)
const rpcStatus = status.get(DataSourceType.RPC)

console.log('GraphQL Status:', {
  isHealthy: graphqlStatus.isHealthy,
  isAvailable: graphqlStatus.isAvailable,
  failureCount: graphqlStatus.failureCount,
  responseTime: graphqlStatus.responseTime
})
```

### Health Check Endpoint

```typescript
// GET /api/unified-example?type=status
{
  "dataSources": {
    "graphql": {
      "type": "graphql",
      "isHealthy": true,
      "isAvailable": true,
      "lastCheck": 1640995200000,
      "failureCount": 0,
      "responseTime": 150
    },
    "rpc": {
      "type": "rpc",
      "isHealthy": true,
      "isAvailable": true,
      "lastCheck": 1640995200000,
      "failureCount": 0,
      "responseTime": 200
    }
  },
  "timestamp": "2022-01-01T00:00:00.000Z"
}
```

## Error Handling

### Circuit Breaker Behavior

1. **Failure Threshold**: After 5 consecutive failures, circuit opens
2. **Circuit Open**: Data source becomes unavailable
3. **Reset Timeout**: Circuit resets after 60 seconds
4. **Health Check**: Automatic health checks restore circuits

### Fallback Behavior

1. **Primary Source**: Try GraphQL first
2. **Fallback Source**: If GraphQL fails, try RPC
3. **Retry Logic**: Retry each source up to 3 times
4. **Exponential Backoff**: Wait between retries

### Error Response Format

```typescript
{
  "error": "Failed to fetch data",
  "message": "GraphQL endpoint timeout",
  "dataSourceStatus": {
    "graphql": { "isAvailable": false, "failureCount": 5 },
    "rpc": { "isAvailable": true, "failureCount": 0 }
  },
  "timestamp": "2022-01-01T00:00:00.000Z"
}
```

## Performance Considerations

### Caching

- GraphQL client includes built-in caching
- RPC responses can be cached at the application level
- Consider implementing Redis for distributed caching

### Timeouts

- GraphQL timeout: 10 seconds
- RPC timeout: 10 seconds
- Health check timeout: 5 seconds
- Configurable per request

### Retry Strategy

- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Maximum backoff: 32 seconds
- Maximum retries: 3 per source

## Testing

### Unit Tests

```typescript
import { DataSourceManager } from './dataSourceManager'

describe('DataSourceManager', () => {
  it('should fallback to RPC when GraphQL fails', async () => {
    const manager = DataSourceManager.getInstance()
    
    const result = await manager.fetchData(
      async (source) => {
        if (source === DataSourceType.GRAPHQL) {
          throw new Error('GraphQL failed')
        }
        return { data: 'from RPC' }
      }
    )
    
    expect(result.source).toBe(DataSourceType.RPC)
    expect(result.fallbackUsed).toBe(true)
  })
})
```

### Integration Tests

```typescript
// Test the unified API endpoint
const response = await fetch('/api/unified-example?type=latest-block')
const data = await response.json()

expect(data.metadata.source).toBeDefined()
expect(data.metadata.responseTime).toBeGreaterThan(0)
expect(data.data).toBeDefined()
```

## Migration Strategy

### Phase 1: Infrastructure (Complete)
- ✅ GraphQL client setup
- ✅ Data source manager
- ✅ Unified interface

### Phase 2: Implementation
- [ ] Replace API routes with unified service
- [ ] Update components to use new interface
- [ ] Implement GraphQL queries

### Phase 3: Testing
- [ ] Data consistency validation
- [ ] Performance testing
- [ ] Error scenario testing

### Phase 4: Deployment
- [ ] Gradual rollout with feature flags
- [ ] Monitoring and alerting
- [ ] Documentation updates

## Troubleshooting

### Common Issues

1. **GraphQL Connection Failed**
   - Check GraphQL endpoint availability
   - Verify network connectivity
   - Check authentication if required

2. **RPC Fallback Not Working**
   - Verify RPC endpoint configuration
   - Check circuit breaker status
   - Review failure logs

3. **Performance Issues**
   - Monitor response times
   - Check for circuit breaker patterns
   - Review caching configuration

### Debug Commands

```typescript
// Check data source status
const status = getDataSourceStatus()
console.log('Data Source Status:', status)

// Reset circuit breaker
dataSourceManager.resetCircuitBreaker(DataSourceType.GRAPHQL)

// Force specific data source
const result = await fetchWithFallback(
  fetchFunction,
  { forceSource: DataSourceType.RPC }
)
```

## Future Enhancements

1. **Advanced Caching**: Redis integration for distributed caching
2. **Metrics Collection**: Prometheus/Grafana integration
3. **Load Balancing**: Multiple GraphQL endpoint support
4. **Rate Limiting**: Request throttling and rate limiting
5. **Compression**: Response compression for large datasets
6. **WebSocket Support**: Real-time data streaming
