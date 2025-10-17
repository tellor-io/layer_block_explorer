// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

// Environment variable helpers with fallbacks
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof window !== 'undefined') {
    return process.env[key] || defaultValue
  }
  return process.env[key] || defaultValue
}

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = getEnvVar(key, defaultValue.toString())
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = getEnvVar(key, defaultValue.toString())
  return value.toLowerCase() === 'true'
}

// =============================================================================
// GRAPHQL CONFIGURATION
// =============================================================================

export const GRAPHQL_ENDPOINTS = [
  getEnvVar(
    'NEXT_PUBLIC_GRAPHQL_ENDPOINT',
    'https://subgraph.sagemode.me/graphql'
  ),
  getEnvVar(
    'NEXT_PUBLIC_GRAPHQL_FALLBACK_ENDPOINT',
    'https://backup-indexer.tellorlayer.com/graphql'
  ),
]

export const GRAPHQL_CONFIG = {
  TIMEOUT: getEnvNumber('NEXT_PUBLIC_GRAPHQL_TIMEOUT', 10000),
  MAX_RETRIES: getEnvNumber('NEXT_PUBLIC_GRAPHQL_MAX_RETRIES', 3),
  HEALTH_CHECK_INTERVAL: getEnvNumber(
    'NEXT_PUBLIC_GRAPHQL_HEALTH_CHECK_INTERVAL',
    30000
  ),
  ENABLED: getEnvBoolean('NEXT_PUBLIC_FEATURE_GRAPHQL_ENABLED', true),
}

// =============================================================================
// RPC CONFIGURATION
// =============================================================================

export const formatRPCEndpoint = (
  endpoint: string,
  includeRPC: boolean = true
) => {
  const baseEndpoint = endpoint.replace('/rpc', '')
  return includeRPC ? `${baseEndpoint}/rpc` : baseEndpoint
}

export const RPC_ENDPOINTS = [
  getEnvVar('NEXT_PUBLIC_RPC_ENDPOINT', 'https://node-palmito.tellorlayer.com/rpc'),
  getEnvVar(
    'NEXT_PUBLIC_RPC_FALLBACK_ENDPOINT',
    'https://mainnet.tellorlayer.com/rpc'
  ),
]

export const RPC_CONFIG = {
  TIMEOUT: getEnvNumber('NEXT_PUBLIC_RPC_TIMEOUT', 15000),
  MAX_RETRIES: getEnvNumber('NEXT_PUBLIC_RPC_MAX_RETRIES', 3),
  HEALTH_CHECK_INTERVAL: getEnvNumber(
    'NEXT_PUBLIC_RPC_HEALTH_CHECK_INTERVAL',
    120000 // Increase to 2 minutes to reduce calls
  ),
}

// =============================================================================
// DATA SOURCE CONFIGURATION
// =============================================================================

export const DATA_SOURCE_CONFIG = {
  PRIMARY: getEnvVar('NEXT_PUBLIC_DATA_SOURCE_PRIMARY', 'graphql') as
    | 'graphql'
    | 'rpc',
  FALLBACK: getEnvVar('NEXT_PUBLIC_DATA_SOURCE_FALLBACK', 'rpc') as
    | 'graphql'
    | 'rpc',
  AUTO_FALLBACK: getEnvBoolean('NEXT_PUBLIC_AUTO_FALLBACK_ENABLED', false), // Disable auto fallback to reduce calls
  HEALTH_CHECK_INTERVAL: getEnvNumber(
    'NEXT_PUBLIC_GRAPHQL_HEALTH_CHECK_INTERVAL',
    120000 // Increase to 2 minutes to reduce calls
  ),
  GRAPHQL_TIMEOUT: getEnvNumber('NEXT_PUBLIC_GRAPHQL_TIMEOUT', 10000),
  GRAPHQL_MAX_RETRIES: getEnvNumber('NEXT_PUBLIC_GRAPHQL_MAX_RETRIES', 3),
}

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export const FEATURE_FLAGS = {
  GRAPHQL_ENABLED: getEnvBoolean('NEXT_PUBLIC_FEATURE_GRAPHQL_ENABLED', true),
  REALTIME_ENABLED: getEnvBoolean('NEXT_PUBLIC_FEATURE_REALTIME_ENABLED', true),
  MONITORING_ENABLED: getEnvBoolean(
    'NEXT_PUBLIC_FEATURE_MONITORING_ENABLED',
    true
  ),
  DATA_SOURCE_SWITCHING: getEnvBoolean(
    'NEXT_PUBLIC_FEATURE_DATA_SOURCE_SWITCHING',
    true
  ),
  METRICS_ENABLED: getEnvBoolean('NEXT_PUBLIC_FEATURE_METRICS_ENABLED', true),
}

// =============================================================================
// MONITORING CONFIGURATION
// =============================================================================

export const MONITORING_CONFIG = {
  MAX_EVENTS: getEnvNumber('NEXT_PUBLIC_MONITORING_MAX_EVENTS', 1000),
  CLEANUP_INTERVAL: getEnvNumber(
    'NEXT_PUBLIC_MONITORING_CLEANUP_INTERVAL',
    300000
  ), // 5 minutes
  METRICS_RETENTION_HOURS: getEnvNumber(
    'NEXT_PUBLIC_MONITORING_RETENTION_HOURS',
    24
  ),
  HEALTH_CHECK_TIMEOUT: getEnvNumber(
    'NEXT_PUBLIC_MONITORING_HEALTH_CHECK_TIMEOUT',
    10000
  ),
  PERFORMANCE_THRESHOLDS: {
    SLOW_QUERY_MS: getEnvNumber('NEXT_PUBLIC_PERFORMANCE_SLOW_QUERY_MS', 5000),
    HIGH_ERROR_RATE_PERCENT: getEnvNumber(
      'NEXT_PUBLIC_PERFORMANCE_HIGH_ERROR_RATE_PERCENT',
      10
    ),
    LOW_UPTIME_PERCENT: getEnvNumber(
      'NEXT_PUBLIC_PERFORMANCE_LOW_UPTIME_PERCENT',
      95
    ),
    HIGH_FALLBACK_RATE_PERCENT: getEnvNumber(
      'NEXT_PUBLIC_PERFORMANCE_HIGH_FALLBACK_RATE_PERCENT',
      20
    ),
  },
  ALERT_THRESHOLDS: {
    CRITICAL_ERROR_RATE: getEnvNumber(
      'NEXT_PUBLIC_ALERT_CRITICAL_ERROR_RATE',
      25
    ),
    CRITICAL_UPTIME: getEnvNumber('NEXT_PUBLIC_ALERT_CRITICAL_UPTIME', 90),
    CRITICAL_RESPONSE_TIME: getEnvNumber(
      'NEXT_PUBLIC_ALERT_CRITICAL_RESPONSE_TIME',
      10000
    ),
  },
}

// =============================================================================
// DEBUG CONFIGURATION
// =============================================================================

export const DEBUG_CONFIG = {
  ENABLED: getEnvBoolean('NEXT_PUBLIC_DEBUG_ENABLED', false),
  GRAPHQL_QUERIES: getEnvBoolean('NEXT_PUBLIC_DEBUG_GRAPHQL_QUERIES', false),
  RPC_CALLS: getEnvBoolean('NEXT_PUBLIC_DEBUG_RPC_CALLS', false),
  PERFORMANCE: getEnvBoolean('NEXT_PUBLIC_DEBUG_PERFORMANCE', false),
}

// =============================================================================
// PRODUCTION CONFIGURATION
// =============================================================================

export const PRODUCTION_CONFIG = {
  MODE: getEnvBoolean('NEXT_PUBLIC_PRODUCTION_MODE', false),
  ENABLE_SW_CACHING: getEnvBoolean('NEXT_PUBLIC_ENABLE_SW_CACHING', false),
  CACHE_TTL: getEnvNumber('NEXT_PUBLIC_CACHE_TTL', 300),
}

// =============================================================================
// LEGACY CONSTANTS (MAINTAINED FOR BACKWARD COMPATIBILITY)
// =============================================================================

export const LS_RPC_ADDRESS = 'RPC_ADDRESS'
export const GOV_PARAMS_TYPE = {
  VOTING: 'voting',
  DEPOSIT: 'deposit',
  TALLY: 'tallying',
}

export type proposalStatus = {
  id: number
  status: string
  color: string
}
export const proposalStatusList: proposalStatus[] = [
  {
    id: 0,
    status: 'UNSPECIFIED',
    color: 'gray',
  },
  {
    id: 1,
    status: 'DEPOSIT PERIOD',
    color: 'blue',
  },
  {
    id: 2,
    status: 'VOTING PERIOD',
    color: 'blue',
  },
  {
    id: 3,
    status: 'PASSED',
    color: 'green',
  },
  {
    id: 4,
    status: 'REJECTED',
    color: 'red',
  },
  {
    id: 5,
    status: 'FAILED',
    color: 'red',
  },
]
