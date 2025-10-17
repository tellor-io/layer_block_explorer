/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Environment variables configuration
  env: {
    // GraphQL Configuration
    NEXT_PUBLIC_GRAPHQL_ENDPOINT: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
    NEXT_PUBLIC_GRAPHQL_FALLBACK_ENDPOINT:
      process.env.NEXT_PUBLIC_GRAPHQL_FALLBACK_ENDPOINT,
    NEXT_PUBLIC_GRAPHQL_TIMEOUT: process.env.NEXT_PUBLIC_GRAPHQL_TIMEOUT,
    NEXT_PUBLIC_GRAPHQL_MAX_RETRIES:
      process.env.NEXT_PUBLIC_GRAPHQL_MAX_RETRIES,
    NEXT_PUBLIC_GRAPHQL_HEALTH_CHECK_INTERVAL:
      process.env.NEXT_PUBLIC_GRAPHQL_HEALTH_CHECK_INTERVAL,

    // RPC Configuration
    NEXT_PUBLIC_RPC_ENDPOINT: process.env.NEXT_PUBLIC_RPC_ENDPOINT,
    NEXT_PUBLIC_RPC_FALLBACK_ENDPOINT:
      process.env.NEXT_PUBLIC_RPC_FALLBACK_ENDPOINT,
    NEXT_PUBLIC_RPC_TIMEOUT: process.env.NEXT_PUBLIC_RPC_TIMEOUT,
    NEXT_PUBLIC_RPC_MAX_RETRIES: process.env.NEXT_PUBLIC_RPC_MAX_RETRIES,
    NEXT_PUBLIC_RPC_HEALTH_CHECK_INTERVAL:
      process.env.NEXT_PUBLIC_RPC_HEALTH_CHECK_INTERVAL,

    // Data Source Configuration
    NEXT_PUBLIC_DATA_SOURCE_PRIMARY:
      process.env.NEXT_PUBLIC_DATA_SOURCE_PRIMARY,
    NEXT_PUBLIC_DATA_SOURCE_FALLBACK:
      process.env.NEXT_PUBLIC_DATA_SOURCE_FALLBACK,
    NEXT_PUBLIC_AUTO_FALLBACK_ENABLED:
      process.env.NEXT_PUBLIC_AUTO_FALLBACK_ENABLED,

    // Feature Flags
    NEXT_PUBLIC_FEATURE_GRAPHQL_ENABLED:
      process.env.NEXT_PUBLIC_FEATURE_GRAPHQL_ENABLED,
    NEXT_PUBLIC_FEATURE_REALTIME_ENABLED:
      process.env.NEXT_PUBLIC_FEATURE_REALTIME_ENABLED,
    NEXT_PUBLIC_FEATURE_MONITORING_ENABLED:
      process.env.NEXT_PUBLIC_FEATURE_MONITORING_ENABLED,
    NEXT_PUBLIC_FEATURE_DATA_SOURCE_SWITCHING:
      process.env.NEXT_PUBLIC_FEATURE_DATA_SOURCE_SWITCHING,
    NEXT_PUBLIC_FEATURE_METRICS_ENABLED:
      process.env.NEXT_PUBLIC_FEATURE_METRICS_ENABLED,

    // Monitoring Configuration
    NEXT_PUBLIC_MONITORING_MAX_EVENTS:
      process.env.NEXT_PUBLIC_MONITORING_MAX_EVENTS,
    NEXT_PUBLIC_MONITORING_CLEANUP_INTERVAL:
      process.env.NEXT_PUBLIC_MONITORING_CLEANUP_INTERVAL,
    NEXT_PUBLIC_MONITORING_RETENTION_HOURS:
      process.env.NEXT_PUBLIC_MONITORING_RETENTION_HOURS,
    NEXT_PUBLIC_MONITORING_HEALTH_CHECK_TIMEOUT:
      process.env.NEXT_PUBLIC_MONITORING_HEALTH_CHECK_TIMEOUT,

    // Performance Thresholds
    NEXT_PUBLIC_PERFORMANCE_SLOW_QUERY_MS:
      process.env.NEXT_PUBLIC_PERFORMANCE_SLOW_QUERY_MS,
    NEXT_PUBLIC_PERFORMANCE_HIGH_ERROR_RATE_PERCENT:
      process.env.NEXT_PUBLIC_PERFORMANCE_HIGH_ERROR_RATE_PERCENT,
    NEXT_PUBLIC_PERFORMANCE_LOW_UPTIME_PERCENT:
      process.env.NEXT_PUBLIC_PERFORMANCE_LOW_UPTIME_PERCENT,
    NEXT_PUBLIC_PERFORMANCE_HIGH_FALLBACK_RATE_PERCENT:
      process.env.NEXT_PUBLIC_PERFORMANCE_HIGH_FALLBACK_RATE_PERCENT,

    // Alert Thresholds
    NEXT_PUBLIC_ALERT_CRITICAL_ERROR_RATE:
      process.env.NEXT_PUBLIC_ALERT_CRITICAL_ERROR_RATE,
    NEXT_PUBLIC_ALERT_CRITICAL_UPTIME:
      process.env.NEXT_PUBLIC_ALERT_CRITICAL_UPTIME,
    NEXT_PUBLIC_ALERT_CRITICAL_RESPONSE_TIME:
      process.env.NEXT_PUBLIC_ALERT_CRITICAL_RESPONSE_TIME,

    // Debug Configuration
    NEXT_PUBLIC_DEBUG_ENABLED: process.env.NEXT_PUBLIC_DEBUG_ENABLED,
    NEXT_PUBLIC_DEBUG_GRAPHQL_QUERIES:
      process.env.NEXT_PUBLIC_DEBUG_GRAPHQL_QUERIES,
    NEXT_PUBLIC_DEBUG_RPC_CALLS: process.env.NEXT_PUBLIC_DEBUG_RPC_CALLS,
    NEXT_PUBLIC_DEBUG_PERFORMANCE: process.env.NEXT_PUBLIC_DEBUG_PERFORMANCE,

    // Production Configuration
    NEXT_PUBLIC_PRODUCTION_MODE: process.env.NEXT_PUBLIC_PRODUCTION_MODE,
    NEXT_PUBLIC_ENABLE_SW_CACHING: process.env.NEXT_PUBLIC_ENABLE_SW_CACHING,
    NEXT_PUBLIC_CACHE_TTL: process.env.NEXT_PUBLIC_CACHE_TTL,
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      issuer: { and: [/\.(js|ts|md)x?$/] },
      type: 'asset/resource',
    })
    return config
  },

  async rewrites() {
    return [
      {
        source: '/api/reporter-selectors/:reporter',
        destination: '/api/reporter-selectors/:reporter',
      },
      {
        source: '/api/current-cycle',
        destination: '/api/current-cycle',
      },
      {
        source: '/api/validators',
        destination: '/api/validators',
      },
    ]
  },

  // Performance optimizations
  experimental: {
    optimizeCss: true,
  },

  // Compression
  compress: true,

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
