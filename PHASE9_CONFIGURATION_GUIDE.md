# Phase 9: Configuration and Environment Guide

## Overview

Phase 9 implements comprehensive configuration management for the Layer Block Explorer, including environment variables, feature flags, and configuration validation. This enables flexible deployment across different environments with proper configuration management.

## Features Implemented

### ✅ Environment Configuration System

- **Environment Variables**: Comprehensive support for all configuration options
- **Type Safety**: TypeScript support for all configuration values
- **Fallback Values**: Sensible defaults for all configuration options
- **Validation**: Built-in configuration validation and health checks

### ✅ Feature Flags System

- **GraphQL Toggle**: Enable/disable GraphQL as primary data source
- **Real-time Features**: Control real-time subscription features
- **Monitoring**: Toggle monitoring and metrics collection
- **Data Source Switching**: Enable/disable UI data source switching
- **Debug Features**: Control debug logging and performance profiling

### ✅ Configuration Validation

- **Health Checks**: Comprehensive configuration health assessment
- **Validation Rules**: Built-in validation for all configuration values
- **Recommendations**: Automatic configuration recommendations
- **Error Reporting**: Detailed error messages for invalid configurations

### ✅ Environment-Specific Settings

- **Development**: Optimized for debugging and development
- **Staging**: Balanced settings for testing and validation
- **Production**: Optimized for performance and reliability

## Configuration Options

### GraphQL Configuration

```bash
# Primary GraphQL endpoint
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://subgraph.sagemode.me/graphql

# Fallback GraphQL endpoint (optional)
NEXT_PUBLIC_GRAPHQL_FALLBACK_ENDPOINT=https://backup-indexer.tellorlayer.com/graphql

# GraphQL connection settings
NEXT_PUBLIC_GRAPHQL_TIMEOUT=10000
NEXT_PUBLIC_GRAPHQL_MAX_RETRIES=3
NEXT_PUBLIC_GRAPHQL_HEALTH_CHECK_INTERVAL=30000
```

### RPC Configuration

```bash
# Primary RPC endpoint
NEXT_PUBLIC_RPC_ENDPOINT=https://mainnet.tellorlayer.com/rpc

# Fallback RPC endpoint
NEXT_PUBLIC_RPC_FALLBACK_ENDPOINT=https://node-palmito.tellorlayer.com/rpc

# RPC connection settings
NEXT_PUBLIC_RPC_TIMEOUT=15000
NEXT_PUBLIC_RPC_MAX_RETRIES=3
NEXT_PUBLIC_RPC_HEALTH_CHECK_INTERVAL=30000
```

### Data Source Configuration

```bash
# Primary data source (graphql | rpc)
NEXT_PUBLIC_DATA_SOURCE_PRIMARY=graphql

# Fallback data source (graphql | rpc)
NEXT_PUBLIC_DATA_SOURCE_FALLBACK=rpc

# Enable automatic fallback when primary source fails
NEXT_PUBLIC_AUTO_FALLBACK_ENABLED=true
```

### Feature Flags

```bash
# Enable GraphQL as primary data source
NEXT_PUBLIC_FEATURE_GRAPHQL_ENABLED=true

# Enable real-time subscriptions
NEXT_PUBLIC_FEATURE_REALTIME_ENABLED=true

# Enable monitoring dashboard
NEXT_PUBLIC_FEATURE_MONITORING_ENABLED=true

# Enable data source switching in UI
NEXT_PUBLIC_FEATURE_DATA_SOURCE_SWITCHING=true

# Enable performance metrics collection
NEXT_PUBLIC_FEATURE_METRICS_ENABLED=true
```

### Monitoring Configuration

```bash
# Maximum number of events to store in memory
NEXT_PUBLIC_MONITORING_MAX_EVENTS=1000

# Cleanup interval for old events (milliseconds)
NEXT_PUBLIC_MONITORING_CLEANUP_INTERVAL=300000

# Metrics retention period (hours)
NEXT_PUBLIC_MONITORING_RETENTION_HOURS=24

# Health check timeout (milliseconds)
NEXT_PUBLIC_MONITORING_HEALTH_CHECK_TIMEOUT=10000
```

### Performance Thresholds

```bash
# Slow query threshold (milliseconds)
NEXT_PUBLIC_PERFORMANCE_SLOW_QUERY_MS=5000

# High error rate threshold (percentage)
NEXT_PUBLIC_PERFORMANCE_HIGH_ERROR_RATE_PERCENT=10

# Low uptime threshold (percentage)
NEXT_PUBLIC_PERFORMANCE_LOW_UPTIME_PERCENT=95

# High fallback rate threshold (percentage)
NEXT_PUBLIC_PERFORMANCE_HIGH_FALLBACK_RATE_PERCENT=20
```

### Alert Thresholds

```bash
# Critical error rate threshold (percentage)
NEXT_PUBLIC_ALERT_CRITICAL_ERROR_RATE=25

# Critical uptime threshold (percentage)
NEXT_PUBLIC_ALERT_CRITICAL_UPTIME=90

# Critical response time threshold (milliseconds)
NEXT_PUBLIC_ALERT_CRITICAL_RESPONSE_TIME=10000
```

### Debug Configuration

```bash
# Enable debug logging
NEXT_PUBLIC_DEBUG_ENABLED=false

# Enable GraphQL query logging
NEXT_PUBLIC_DEBUG_GRAPHQL_QUERIES=false

# Enable RPC call logging
NEXT_PUBLIC_DEBUG_RPC_CALLS=false

# Enable performance profiling
NEXT_PUBLIC_DEBUG_PERFORMANCE=false
```

### Production Configuration

```bash
# Environment (development | staging | production)
NODE_ENV=development

# Enable production optimizations
NEXT_PUBLIC_PRODUCTION_MODE=false

# Enable service worker caching
NEXT_PUBLIC_ENABLE_SW_CACHING=false

# Cache TTL for static data (seconds)
NEXT_PUBLIC_CACHE_TTL=300
```

## Environment-Specific Configurations

### Development Environment

```bash
# Development settings
NEXT_PUBLIC_DEBUG_ENABLED=true
NEXT_PUBLIC_DEBUG_GRAPHQL_QUERIES=true
NEXT_PUBLIC_DEBUG_RPC_CALLS=true
NEXT_PUBLIC_GRAPHQL_TIMEOUT=5000
NEXT_PUBLIC_RPC_TIMEOUT=10000
NEXT_PUBLIC_MONITORING_MAX_EVENTS=500
```

### Staging Environment

```bash
# Staging settings
NEXT_PUBLIC_DEBUG_ENABLED=false
NEXT_PUBLIC_DEBUG_GRAPHQL_QUERIES=false
NEXT_PUBLIC_DEBUG_RPC_CALLS=false
NEXT_PUBLIC_GRAPHQL_TIMEOUT=10000
NEXT_PUBLIC_RPC_TIMEOUT=15000
NEXT_PUBLIC_MONITORING_MAX_EVENTS=1000
```

### Production Environment

```bash
# Production settings
NEXT_PUBLIC_DEBUG_ENABLED=false
NEXT_PUBLIC_DEBUG_GRAPHQL_QUERIES=false
NEXT_PUBLIC_DEBUG_RPC_CALLS=false
NEXT_PUBLIC_GRAPHQL_TIMEOUT=10000
NEXT_PUBLIC_RPC_TIMEOUT=15000
NEXT_PUBLIC_MONITORING_MAX_EVENTS=2000
NEXT_PUBLIC_PRODUCTION_MODE=true
NEXT_PUBLIC_ENABLE_SW_CACHING=true
```

## Configuration API

### Configuration Status Endpoint

```bash
# Get full configuration status
GET /api/config/status

# Get configuration validation
GET /api/config/status?type=validation

# Get configuration health
GET /api/config/status?type=health

# Get configuration summary
GET /api/config/status?type=summary

# Get environment validation
GET /api/config/status?type=environment

# Get recommendations for specific environment
GET /api/config/status?type=recommendations&env=production
```

### Response Format

```json
{
  "success": true,
  "data": {
    "validation": {
      "isValid": true,
      "errors": [],
      "warnings": [],
      "recommendations": []
    },
    "health": {
      "overall": "healthy",
      "issues": [],
      "recommendations": []
    },
    "summary": {
      "graphql": { "enabled": true, "timeout": 10000 },
      "rpc": { "timeout": 15000, "maxRetries": 3 },
      "dataSource": { "primary": "graphql", "fallback": "rpc" },
      "features": { "graphql": true, "realtime": true },
      "monitoring": { "maxEvents": 1000, "retentionHours": 24 },
      "debug": { "enabled": false, "graphqlQueries": false },
      "production": { "mode": false, "swCaching": false }
    }
  }
}
```

## Usage Examples

### Basic Configuration

```typescript
import {
  GRAPHQL_CONFIG,
  RPC_CONFIG,
  DATA_SOURCE_CONFIG,
  FEATURE_FLAGS,
} from '../utils/constant'

// Check if GraphQL is enabled
if (FEATURE_FLAGS.GRAPHQL_ENABLED) {
  // Use GraphQL as primary source
  const data = await graphqlService.getData()
} else {
  // Fall back to RPC
  const data = await rpcService.getData()
}

// Check data source configuration
if (DATA_SOURCE_CONFIG.PRIMARY === 'graphql') {
  // Configure GraphQL client with timeout
  const client = new ApolloClient({
    uri: GRAPHQL_ENDPOINTS[0],
    timeout: GRAPHQL_CONFIG.TIMEOUT,
  })
}
```

### Configuration Validation

```typescript
import {
  validateConfiguration,
  checkConfigHealth,
} from '../utils/configValidator'

// Validate current configuration
const validation = validateConfiguration()
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors)
}

// Check configuration health
const health = checkConfigHealth()
if (health.overall === 'critical') {
  console.error('Critical configuration issues:', health.issues)
}
```

### Feature Flag Usage

```typescript
import { FEATURE_FLAGS } from '../utils/constant'

// Conditional feature rendering
{
  FEATURE_FLAGS.MONITORING_ENABLED && <MonitoringDashboard />
}

// Conditional data source switching
{
  FEATURE_FLAGS.DATA_SOURCE_SWITCHING && <DataSourceSwitcher />
}
```

## Deployment Guide

### 1. Environment Setup

Create environment-specific configuration files:

```bash
# Development
cp .env.example .env.local

# Staging
cp .env.example .env.staging

# Production
cp .env.example .env.production
```

### 2. Configuration Validation

Before deployment, validate your configuration:

```bash
# Check configuration status
curl http://localhost:3000/api/config/status

# Validate specific environment
curl "http://localhost:3000/api/config/status?type=validation"

# Get production recommendations
curl "http://localhost:3000/api/config/status?type=recommendations&env=production"
```

### 3. Environment-Specific Deployment

#### Development

```bash
# Set development environment
NODE_ENV=development npm run dev
```

#### Staging

```bash
# Set staging environment
NODE_ENV=staging npm run build && npm start
```

#### Production

```bash
# Set production environment
NODE_ENV=production npm run build && npm start
```

## Troubleshooting

### Common Issues

1. **Invalid Environment Variables**

   - Check variable names (must start with `NEXT_PUBLIC_`)
   - Verify URL formats for endpoints
   - Ensure numeric values are valid numbers
   - Check boolean values are "true" or "false"

2. **Configuration Validation Errors**

   - Use `/api/config/status?type=validation` to check errors
   - Review recommended configurations
   - Check environment-specific settings

3. **Feature Flag Issues**
   - Verify feature flags are properly set
   - Check that required features are enabled
   - Ensure data source configuration matches feature flags

### Debug Configuration

```bash
# Enable debug logging
NEXT_PUBLIC_DEBUG_ENABLED=true
NEXT_PUBLIC_DEBUG_GRAPHQL_QUERIES=true
NEXT_PUBLIC_DEBUG_RPC_CALLS=true

# Check configuration in browser console
console.log('Configuration:', window.__NEXT_DATA__.props.config)
```

## Best Practices

### 1. Environment-Specific Settings

- Use different configurations for development, staging, and production
- Disable debug features in production
- Enable performance optimizations in production

### 2. Feature Flag Management

- Use feature flags for gradual rollouts
- Test with feature flags disabled
- Monitor feature flag usage

### 3. Configuration Validation

- Validate configuration before deployment
- Use health checks to monitor configuration
- Set up alerts for configuration issues

### 4. Security Considerations

- Never expose sensitive data in client-side environment variables
- Use server-side environment variables for sensitive configuration
- Validate all configuration inputs

## Migration from Previous Phases

### Updating Existing Code

1. **Replace Hardcoded Values**

   ```typescript
   // Before
   const timeout = 10000

   // After
   import { GRAPHQL_CONFIG } from '../utils/constant'
   const timeout = GRAPHQL_CONFIG.TIMEOUT
   ```

2. **Add Feature Flag Checks**

   ```typescript
   // Before
   if (useGraphQL) {
     // GraphQL logic
   }

   // After
   import { FEATURE_FLAGS } from '../utils/constant'
   if (FEATURE_FLAGS.GRAPHQL_ENABLED) {
     // GraphQL logic
   }
   ```

3. **Use Configuration Validation**

   ```typescript
   // Add configuration validation to your components
   import { validateConfiguration } from '../utils/configValidator'

   useEffect(() => {
     const validation = validateConfiguration()
     if (!validation.isValid) {
       console.warn('Configuration issues:', validation.errors)
     }
   }, [])
   ```

## Performance Considerations

### 1. Environment Variable Access

- Environment variables are read once at build time
- No runtime performance impact
- Cached in Next.js configuration

### 2. Configuration Validation

- Validation runs only when requested
- Cached results for performance
- Minimal impact on application startup

### 3. Feature Flags

- Boolean checks are very fast
- No runtime overhead
- Optimized for production use

## Monitoring and Observability

### Configuration Health Monitoring

- Use `/api/config/status?type=health` for health checks
- Monitor configuration changes
- Set up alerts for configuration issues

### Performance Monitoring

- Track configuration validation performance
- Monitor feature flag usage
- Measure configuration impact on application performance

## Future Enhancements

### Planned Features

1. **Dynamic Configuration**: Runtime configuration updates
2. **Configuration Templates**: Pre-built configuration templates
3. **Configuration Migration**: Automated configuration migration tools
4. **Advanced Validation**: Custom validation rules
5. **Configuration Analytics**: Usage analytics and insights

### Integration Points

1. **CI/CD Integration**: Automated configuration validation in pipelines
2. **Monitoring Integration**: Configuration monitoring in observability tools
3. **Security Integration**: Security scanning for configuration issues
4. **Performance Integration**: Configuration impact on performance metrics

This comprehensive configuration system provides the foundation for flexible, maintainable, and scalable deployment across different environments while maintaining the reliability and performance of the Layer Block Explorer.
