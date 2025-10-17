// =============================================================================
// CONFIGURATION VALIDATION UTILITY
// =============================================================================

import {
  GRAPHQL_CONFIG,
  RPC_CONFIG,
  DATA_SOURCE_CONFIG,
  FEATURE_FLAGS,
  MONITORING_CONFIG,
  DEBUG_CONFIG,
  PRODUCTION_CONFIG,
} from './constant'

export interface ConfigValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

export interface ConfigHealth {
  overall: 'healthy' | 'warning' | 'critical'
  issues: string[]
  recommendations: string[]
}

/**
 * Validates the current configuration and returns validation results
 */
export const validateConfiguration = (): ConfigValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []

  // Validate GraphQL configuration
  if (GRAPHQL_CONFIG.TIMEOUT < 1000) {
    errors.push('GraphQL timeout is too low (< 1000ms)')
  }
  if (GRAPHQL_CONFIG.TIMEOUT > 30000) {
    warnings.push('GraphQL timeout is very high (> 30s)')
  }
  if (GRAPHQL_CONFIG.MAX_RETRIES < 1) {
    errors.push('GraphQL max retries must be at least 1')
  }
  if (GRAPHQL_CONFIG.MAX_RETRIES > 10) {
    warnings.push('GraphQL max retries is very high (> 10)')
  }

  // Validate RPC configuration
  if (RPC_CONFIG.TIMEOUT < 1000) {
    errors.push('RPC timeout is too low (< 1000ms)')
  }
  if (RPC_CONFIG.TIMEOUT > 60000) {
    warnings.push('RPC timeout is very high (> 60s)')
  }
  if (RPC_CONFIG.MAX_RETRIES < 1) {
    errors.push('RPC max retries must be at least 1')
  }
  if (RPC_CONFIG.MAX_RETRIES > 10) {
    warnings.push('RPC max retries is very high (> 10)')
  }

  // Validate data source configuration
  if (!['graphql', 'rpc'].includes(DATA_SOURCE_CONFIG.PRIMARY)) {
    errors.push('Primary data source must be either "graphql" or "rpc"')
  }
  if (!['graphql', 'rpc'].includes(DATA_SOURCE_CONFIG.FALLBACK)) {
    errors.push('Fallback data source must be either "graphql" or "rpc"')
  }
  if (DATA_SOURCE_CONFIG.PRIMARY === DATA_SOURCE_CONFIG.FALLBACK) {
    warnings.push('Primary and fallback data sources are the same')
  }

  // Validate monitoring configuration
  if (MONITORING_CONFIG.MAX_EVENTS < 100) {
    warnings.push('Monitoring max events is low (< 100)')
  }
  if (MONITORING_CONFIG.MAX_EVENTS > 10000) {
    warnings.push('Monitoring max events is very high (> 10,000)')
  }
  if (MONITORING_CONFIG.METRICS_RETENTION_HOURS < 1) {
    errors.push('Metrics retention must be at least 1 hour')
  }
  if (MONITORING_CONFIG.METRICS_RETENTION_HOURS > 168) {
    warnings.push('Metrics retention is very long (> 7 days)')
  }

  // Validate performance thresholds
  if (MONITORING_CONFIG.PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS < 1000) {
    warnings.push('Slow query threshold is very low (< 1s)')
  }
  if (MONITORING_CONFIG.PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE_PERCENT < 1) {
    warnings.push('High error rate threshold is very low (< 1%)')
  }
  if (MONITORING_CONFIG.PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE_PERCENT > 50) {
    warnings.push('High error rate threshold is very high (> 50%)')
  }

  // Validate alert thresholds
  if (MONITORING_CONFIG.ALERT_THRESHOLDS.CRITICAL_ERROR_RATE < 10) {
    warnings.push('Critical error rate threshold is very low (< 10%)')
  }
  if (MONITORING_CONFIG.ALERT_THRESHOLDS.CRITICAL_ERROR_RATE > 90) {
    warnings.push('Critical error rate threshold is very high (> 90%)')
  }

  // Generate recommendations
  if (
    !FEATURE_FLAGS.GRAPHQL_ENABLED &&
    DATA_SOURCE_CONFIG.PRIMARY === 'graphql'
  ) {
    recommendations.push(
      'Consider enabling GraphQL feature flag if using GraphQL as primary source'
    )
  }
  if (!FEATURE_FLAGS.MONITORING_ENABLED && MONITORING_CONFIG.MAX_EVENTS > 0) {
    recommendations.push(
      'Consider enabling monitoring feature flag for better observability'
    )
  }
  if (DEBUG_CONFIG.ENABLED && PRODUCTION_CONFIG.MODE) {
    recommendations.push(
      'Disable debug mode in production for better performance'
    )
  }
  if (!DATA_SOURCE_CONFIG.AUTO_FALLBACK) {
    recommendations.push(
      'Consider enabling auto-fallback for better reliability'
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations,
  }
}

/**
 * Checks the health of the current configuration
 */
export const checkConfigHealth = (): ConfigHealth => {
  const validation = validateConfiguration()
  const issues: string[] = []
  const recommendations: string[] = []

  // Determine overall health
  let overall: 'healthy' | 'warning' | 'critical' = 'healthy'

  if (validation.errors.length > 0) {
    overall = 'critical'
    issues.push(...validation.errors)
  }

  if (validation.warnings.length > 0) {
    if (overall === 'healthy') {
      overall = 'warning'
    }
    issues.push(...validation.warnings)
  }

  recommendations.push(...validation.recommendations)

  return {
    overall,
    issues,
    recommendations,
  }
}

/**
 * Gets configuration summary for debugging
 */
export const getConfigSummary = () => {
  return {
    graphql: {
      enabled: FEATURE_FLAGS.GRAPHQL_ENABLED,
      timeout: GRAPHQL_CONFIG.TIMEOUT,
      maxRetries: GRAPHQL_CONFIG.MAX_RETRIES,
      healthCheckInterval: GRAPHQL_CONFIG.HEALTH_CHECK_INTERVAL,
    },
    rpc: {
      timeout: RPC_CONFIG.TIMEOUT,
      maxRetries: RPC_CONFIG.MAX_RETRIES,
      healthCheckInterval: RPC_CONFIG.HEALTH_CHECK_INTERVAL,
    },
    dataSource: {
      primary: DATA_SOURCE_CONFIG.PRIMARY,
      fallback: DATA_SOURCE_CONFIG.FALLBACK,
      autoFallback: DATA_SOURCE_CONFIG.AUTO_FALLBACK,
    },
    features: {
      graphql: FEATURE_FLAGS.GRAPHQL_ENABLED,
      realtime: FEATURE_FLAGS.REALTIME_ENABLED,
      monitoring: FEATURE_FLAGS.MONITORING_ENABLED,
      dataSourceSwitching: FEATURE_FLAGS.DATA_SOURCE_SWITCHING,
      metrics: FEATURE_FLAGS.METRICS_ENABLED,
    },
    monitoring: {
      maxEvents: MONITORING_CONFIG.MAX_EVENTS,
      retentionHours: MONITORING_CONFIG.METRICS_RETENTION_HOURS,
      cleanupInterval: MONITORING_CONFIG.CLEANUP_INTERVAL,
    },
    debug: {
      enabled: DEBUG_CONFIG.ENABLED,
      graphqlQueries: DEBUG_CONFIG.GRAPHQL_QUERIES,
      rpcCalls: DEBUG_CONFIG.RPC_CALLS,
      performance: DEBUG_CONFIG.PERFORMANCE,
    },
    production: {
      mode: PRODUCTION_CONFIG.MODE,
      swCaching: PRODUCTION_CONFIG.ENABLE_SW_CACHING,
      cacheTtl: PRODUCTION_CONFIG.CACHE_TTL,
    },
  }
}

/**
 * Validates environment variables and provides helpful error messages
 */
export const validateEnvironmentVariables = (): {
  valid: boolean
  missing: string[]
  invalid: string[]
} => {
  const requiredVars = [
    'NEXT_PUBLIC_GRAPHQL_ENDPOINT',
    'NEXT_PUBLIC_RPC_ENDPOINT',
  ]

  const missing: string[] = []
  const invalid: string[] = []

  // Check for missing required variables
  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  })

  // Validate URL formats
  const urlVars = [
    'NEXT_PUBLIC_GRAPHQL_ENDPOINT',
    'NEXT_PUBLIC_GRAPHQL_FALLBACK_ENDPOINT',
    'NEXT_PUBLIC_RPC_ENDPOINT',
    'NEXT_PUBLIC_RPC_FALLBACK_ENDPOINT',
  ]

  urlVars.forEach((varName) => {
    const value = process.env[varName]
    if (value && !isValidUrl(value)) {
      invalid.push(`${varName}: "${value}" is not a valid URL`)
    }
  })

  // Validate numeric values
  const numericVars = [
    'NEXT_PUBLIC_GRAPHQL_TIMEOUT',
    'NEXT_PUBLIC_GRAPHQL_MAX_RETRIES',
    'NEXT_PUBLIC_RPC_TIMEOUT',
    'NEXT_PUBLIC_RPC_MAX_RETRIES',
  ]

  numericVars.forEach((varName) => {
    const value = process.env[varName]
    if (value && isNaN(Number(value))) {
      invalid.push(`${varName}: "${value}" is not a valid number`)
    }
  })

  // Validate boolean values
  const booleanVars = [
    'NEXT_PUBLIC_AUTO_FALLBACK_ENABLED',
    'NEXT_PUBLIC_FEATURE_GRAPHQL_ENABLED',
    'NEXT_PUBLIC_FEATURE_REALTIME_ENABLED',
    'NEXT_PUBLIC_FEATURE_MONITORING_ENABLED',
    'NEXT_PUBLIC_DEBUG_ENABLED',
  ]

  booleanVars.forEach((varName) => {
    const value = process.env[varName]
    if (value && !['true', 'false'].includes(value.toLowerCase())) {
      invalid.push(`${varName}: "${value}" must be "true" or "false"`)
    }
  })

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  }
}

/**
 * Helper function to validate URL format
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Gets recommended configuration for different environments
 */
export const getRecommendedConfig = (
  environment: 'development' | 'staging' | 'production'
) => {
  const baseConfig = {
    development: {
      NEXT_PUBLIC_DEBUG_ENABLED: 'true',
      NEXT_PUBLIC_DEBUG_GRAPHQL_QUERIES: 'true',
      NEXT_PUBLIC_DEBUG_RPC_CALLS: 'true',
      NEXT_PUBLIC_GRAPHQL_TIMEOUT: '5000',
      NEXT_PUBLIC_RPC_TIMEOUT: '10000',
      NEXT_PUBLIC_MONITORING_MAX_EVENTS: '500',
    },
    staging: {
      NEXT_PUBLIC_DEBUG_ENABLED: 'false',
      NEXT_PUBLIC_DEBUG_GRAPHQL_QUERIES: 'false',
      NEXT_PUBLIC_DEBUG_RPC_CALLS: 'false',
      NEXT_PUBLIC_GRAPHQL_TIMEOUT: '10000',
      NEXT_PUBLIC_RPC_TIMEOUT: '15000',
      NEXT_PUBLIC_MONITORING_MAX_EVENTS: '1000',
    },
    production: {
      NEXT_PUBLIC_DEBUG_ENABLED: 'false',
      NEXT_PUBLIC_DEBUG_GRAPHQL_QUERIES: 'false',
      NEXT_PUBLIC_DEBUG_RPC_CALLS: 'false',
      NEXT_PUBLIC_GRAPHQL_TIMEOUT: '10000',
      NEXT_PUBLIC_RPC_TIMEOUT: '15000',
      NEXT_PUBLIC_MONITORING_MAX_EVENTS: '2000',
      NEXT_PUBLIC_PRODUCTION_MODE: 'true',
      NEXT_PUBLIC_ENABLE_SW_CACHING: 'true',
    },
  }

  return baseConfig[environment]
}
