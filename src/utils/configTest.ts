// =============================================================================
// CONFIGURATION TEST UTILITY
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
import {
  validateConfiguration,
  checkConfigHealth,
  getConfigSummary,
  validateEnvironmentVariables,
} from './configValidator'

/**
 * Test configuration system and log results
 */
export const testConfiguration = () => {
  console.log('🔧 Testing Layer Block Explorer Configuration System')
  console.log('='.repeat(60))

  // Test 1: Configuration Summary
  console.log('\n📊 Configuration Summary:')
  const summary = getConfigSummary()
  console.log(JSON.stringify(summary, null, 2))

  // Test 2: Configuration Validation
  console.log('\n✅ Configuration Validation:')
  const validation = validateConfiguration()
  console.log(`Valid: ${validation.isValid}`)
  if (validation.errors.length > 0) {
    console.log('Errors:', validation.errors)
  }
  if (validation.warnings.length > 0) {
    console.log('Warnings:', validation.warnings)
  }
  if (validation.recommendations.length > 0) {
    console.log('Recommendations:', validation.recommendations)
  }

  // Test 3: Configuration Health
  console.log('\n🏥 Configuration Health:')
  const health = checkConfigHealth()
  console.log(`Overall Health: ${health.overall}`)
  if (health.issues.length > 0) {
    console.log('Issues:', health.issues)
  }
  if (health.recommendations.length > 0) {
    console.log('Recommendations:', health.recommendations)
  }

  // Test 4: Environment Variables
  console.log('\n🌍 Environment Variables:')
  const envValidation = validateEnvironmentVariables()
  console.log(`Valid: ${envValidation.valid}`)
  if (envValidation.missing.length > 0) {
    console.log('Missing:', envValidation.missing)
  }
  if (envValidation.invalid.length > 0) {
    console.log('Invalid:', envValidation.invalid)
  }

  // Test 5: Feature Flags Status
  console.log('\n🚩 Feature Flags Status:')
  console.log(`GraphQL Enabled: ${FEATURE_FLAGS.GRAPHQL_ENABLED}`)
  console.log(`Real-time Enabled: ${FEATURE_FLAGS.REALTIME_ENABLED}`)
  console.log(`Monitoring Enabled: ${FEATURE_FLAGS.MONITORING_ENABLED}`)
  console.log(`Data Source Switching: ${FEATURE_FLAGS.DATA_SOURCE_SWITCHING}`)
  console.log(`Metrics Enabled: ${FEATURE_FLAGS.METRICS_ENABLED}`)

  // Test 6: Data Source Configuration
  console.log('\n📡 Data Source Configuration:')
  console.log(`Primary: ${DATA_SOURCE_CONFIG.PRIMARY}`)
  console.log(`Fallback: ${DATA_SOURCE_CONFIG.FALLBACK}`)
  console.log(`Auto Fallback: ${DATA_SOURCE_CONFIG.AUTO_FALLBACK}`)

  // Test 7: Performance Settings
  console.log('\n⚡ Performance Settings:')
  console.log(`GraphQL Timeout: ${GRAPHQL_CONFIG.TIMEOUT}ms`)
  console.log(`RPC Timeout: ${RPC_CONFIG.TIMEOUT}ms`)
  console.log(`GraphQL Max Retries: ${GRAPHQL_CONFIG.MAX_RETRIES}`)
  console.log(`RPC Max Retries: ${RPC_CONFIG.MAX_RETRIES}`)

  // Test 8: Monitoring Configuration
  console.log('\n📈 Monitoring Configuration:')
  console.log(`Max Events: ${MONITORING_CONFIG.MAX_EVENTS}`)
  console.log(`Retention Hours: ${MONITORING_CONFIG.METRICS_RETENTION_HOURS}`)
  console.log(`Cleanup Interval: ${MONITORING_CONFIG.CLEANUP_INTERVAL}ms`)

  // Test 9: Debug Configuration
  console.log('\n🐛 Debug Configuration:')
  console.log(`Debug Enabled: ${DEBUG_CONFIG.ENABLED}`)
  console.log(`GraphQL Query Logging: ${DEBUG_CONFIG.GRAPHQL_QUERIES}`)
  console.log(`RPC Call Logging: ${DEBUG_CONFIG.RPC_CALLS}`)
  console.log(`Performance Logging: ${DEBUG_CONFIG.PERFORMANCE}`)

  // Test 10: Production Configuration
  console.log('\n🏭 Production Configuration:')
  console.log(`Production Mode: ${PRODUCTION_CONFIG.MODE}`)
  console.log(`Service Worker Caching: ${PRODUCTION_CONFIG.ENABLE_SW_CACHING}`)
  console.log(`Cache TTL: ${PRODUCTION_CONFIG.CACHE_TTL}s`)

  console.log('\n' + '='.repeat(60))
  console.log('✅ Configuration test completed!')

  return {
    summary,
    validation,
    health,
    envValidation,
  }
}

/**
 * Test configuration with different scenarios
 */
export const testConfigurationScenarios = () => {
  console.log('\n🧪 Testing Configuration Scenarios')
  console.log('='.repeat(60))

  // Scenario 1: All features enabled
  console.log('\n📋 Scenario 1: All Features Enabled')
  console.log('GraphQL:', FEATURE_FLAGS.GRAPHQL_ENABLED)
  console.log('Real-time:', FEATURE_FLAGS.REALTIME_ENABLED)
  console.log('Monitoring:', FEATURE_FLAGS.MONITORING_ENABLED)
  console.log('Data Source Switching:', FEATURE_FLAGS.DATA_SOURCE_SWITCHING)
  console.log('Metrics:', FEATURE_FLAGS.METRICS_ENABLED)

  // Scenario 2: GraphQL as primary with RPC fallback
  console.log('\n📋 Scenario 2: GraphQL Primary with RPC Fallback')
  console.log('Primary Source:', DATA_SOURCE_CONFIG.PRIMARY)
  console.log('Fallback Source:', DATA_SOURCE_CONFIG.FALLBACK)
  console.log('Auto Fallback:', DATA_SOURCE_CONFIG.AUTO_FALLBACK)

  // Scenario 3: Debug mode
  console.log('\n📋 Scenario 3: Debug Mode')
  console.log('Debug Enabled:', DEBUG_CONFIG.ENABLED)
  console.log('GraphQL Query Logging:', DEBUG_CONFIG.GRAPHQL_QUERIES)
  console.log('RPC Call Logging:', DEBUG_CONFIG.RPC_CALLS)
  console.log('Performance Logging:', DEBUG_CONFIG.PERFORMANCE)

  // Scenario 4: Production mode
  console.log('\n📋 Scenario 4: Production Mode')
  console.log('Production Mode:', PRODUCTION_CONFIG.MODE)
  console.log('Service Worker Caching:', PRODUCTION_CONFIG.ENABLE_SW_CACHING)
  console.log('Cache TTL:', PRODUCTION_CONFIG.CACHE_TTL)

  console.log('\n' + '='.repeat(60))
  console.log('✅ Configuration scenarios test completed!')
}

/**
 * Run all configuration tests
 */
export const runAllConfigurationTests = () => {
  console.log('🚀 Running All Configuration Tests')
  console.log('='.repeat(80))

  const results = testConfiguration()
  testConfigurationScenarios()

  console.log('\n📊 Test Results Summary:')
  console.log(`Configuration Valid: ${results.validation.isValid}`)
  console.log(`Health Status: ${results.health.overall}`)
  console.log(`Environment Variables Valid: ${results.envValidation.valid}`)

  if (!results.validation.isValid) {
    console.log('❌ Configuration has errors that need to be fixed')
  } else if (results.health.overall === 'warning') {
    console.log('⚠️ Configuration has warnings that should be reviewed')
  } else {
    console.log('✅ Configuration is healthy and ready for use')
  }

  return results
}

// Export for use in other modules
const configTestUtils = {
  testConfiguration,
  testConfigurationScenarios,
  runAllConfigurationTests,
}

export default configTestUtils
