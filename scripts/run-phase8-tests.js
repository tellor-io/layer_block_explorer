#!/usr/bin/env node

/**
 * Phase 8 Test Runner
 *
 * This script runs all Phase 8 tests with comprehensive reporting
 * and validation of the GraphQL migration testing infrastructure.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Test configuration
const TEST_CONFIG = {
  suites: [
    {
      name: 'Data Consistency Tests',
      command: 'npm run test:data-consistency',
      description: 'Tests data consistency between GraphQL and RPC sources',
    },
    {
      name: 'Fallback Behavior Tests',
      command: 'npm run test:fallback',
      description: 'Tests automatic fallback from GraphQL to RPC',
    },
    {
      name: 'Integration Tests',
      command: 'npm run test:integration',
      description: 'Tests complete data flows and component integration',
    },
    {
      name: 'Performance Tests',
      command: 'npm run test:performance',
      description: 'Benchmarks performance between GraphQL and RPC',
    },
    {
      name: 'Error Scenario Tests',
      command: 'npm run test:error-scenarios',
      description: 'Tests system behavior under various error conditions',
    },
  ],
  coverage: {
    command: 'npm run test:coverage',
    description: 'Runs all tests with coverage reporting',
  },
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

// Utility functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logHeader(message) {
  log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`)
  log(`${colors.bright}${colors.cyan}${message}${colors.reset}`)
  log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`)
}

function logSection(message) {
  log(`\n${colors.bright}${colors.blue}${message}${colors.reset}`)
  log(`${colors.blue}${'-'.repeat(message.length)}${colors.reset}`)
}

function logSuccess(message) {
  log(`${colors.green}✅ ${message}${colors.reset}`)
}

function logError(message) {
  log(`${colors.red}❌ ${message}${colors.reset}`)
}

function logWarning(message) {
  log(`${colors.yellow}⚠️  ${message}${colors.reset}`)
}

function logInfo(message) {
  log(`${colors.blue}ℹ️  ${message}${colors.reset}`)
}

// Test execution functions
function runTestSuite(suite) {
  logSection(`Running ${suite.name}`)
  logInfo(suite.description)

  try {
    const startTime = Date.now()
    execSync(suite.command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    logSuccess(`${suite.name} completed successfully in ${duration}s`)
    return { success: true, duration }
  } catch (error) {
    logError(`${suite.name} failed: ${error.message}`)
    return { success: false, error: error.message }
  }
}

function runCoverageTests() {
  logSection('Running Coverage Tests')
  logInfo('Generating comprehensive test coverage report')

  try {
    const startTime = Date.now()
    execSync(TEST_CONFIG.coverage.command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    logSuccess(`Coverage tests completed successfully in ${duration}s`)
    return { success: true, duration }
  } catch (error) {
    logError(`Coverage tests failed: ${error.message}`)
    return { success: false, error: error.message }
  }
}

function generateTestReport(results) {
  const reportPath = path.join(
    process.cwd(),
    'test-reports',
    'phase8-test-report.json'
  )
  const reportDir = path.dirname(reportPath)

  // Create reports directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }

  const report = {
    timestamp: new Date().toISOString(),
    phase: 'Phase 8: Testing and Validation',
    summary: {
      totalSuites: results.length,
      passedSuites: results.filter((r) => r.success).length,
      failedSuites: results.filter((r) => !r.success).length,
      totalDuration: results
        .reduce((sum, r) => sum + (r.duration || 0), 0)
        .toFixed(2),
    },
    results: results,
    recommendations: generateRecommendations(results),
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  logInfo(`Test report saved to: ${reportPath}`)

  return report
}

function generateRecommendations(results) {
  const recommendations = []

  const failedSuites = results.filter((r) => !r.success)
  if (failedSuites.length > 0) {
    recommendations.push({
      type: 'error',
      message: `${failedSuites.length} test suite(s) failed. Review and fix failing tests.`,
      suites: failedSuites.map((r) => r.name),
    })
  }

  const slowSuites = results.filter((r) => r.success && r.duration > 30)
  if (slowSuites.length > 0) {
    recommendations.push({
      type: 'performance',
      message: `${slowSuites.length} test suite(s) took longer than 30 seconds. Consider optimization.`,
      suites: slowSuites.map((r) => r.name),
    })
  }

  const allPassed = results.every((r) => r.success)
  if (allPassed) {
    recommendations.push({
      type: 'success',
      message:
        'All test suites passed successfully. Phase 8 testing is complete.',
      nextSteps: [
        'Review test coverage report',
        'Validate performance benchmarks',
        'Check error scenario coverage',
        'Proceed to Phase 9: Configuration and Environment',
      ],
    })
  }

  return recommendations
}

function displaySummary(report) {
  logHeader('Phase 8 Test Summary')

  logInfo(`Total Test Suites: ${report.summary.totalSuites}`)
  logSuccess(`Passed: ${report.summary.passedSuites}`)

  if (report.summary.failedSuites > 0) {
    logError(`Failed: ${report.summary.failedSuites}`)
  }

  logInfo(`Total Duration: ${report.summary.totalDuration}s`)

  logSection('Recommendations')
  report.recommendations.forEach((rec) => {
    switch (rec.type) {
      case 'error':
        logError(rec.message)
        break
      case 'performance':
        logWarning(rec.message)
        break
      case 'success':
        logSuccess(rec.message)
        if (rec.nextSteps) {
          rec.nextSteps.forEach((step) => {
            logInfo(`  • ${step}`)
          })
        }
        break
    }
  })
}

// Main execution
async function main() {
  logHeader('Phase 8: Testing and Validation')
  logInfo('Starting comprehensive testing of GraphQL migration infrastructure')

  const results = []

  // Run individual test suites
  for (const suite of TEST_CONFIG.suites) {
    const result = runTestSuite(suite)
    results.push({
      name: suite.name,
      description: suite.description,
      ...result,
    })
  }

  // Run coverage tests
  const coverageResult = runCoverageTests()
  results.push({
    name: 'Coverage Tests',
    description: TEST_CONFIG.coverage.description,
    ...coverageResult,
  })

  // Generate and display report
  const report = generateTestReport(results)
  displaySummary(report)

  // Exit with appropriate code
  const hasFailures = results.some((r) => !r.success)
  if (hasFailures) {
    logError(
      '\nSome tests failed. Please review the results and fix any issues.'
    )
    process.exit(1)
  } else {
    logSuccess('\nAll Phase 8 tests completed successfully!')
    logInfo(
      'The GraphQL migration testing infrastructure is ready for production.'
    )
    process.exit(0)
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled rejection at: ${promise}, reason: ${reason}`)
  process.exit(1)
})

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    logError(`Test runner failed: ${error.message}`)
    process.exit(1)
  })
}

module.exports = {
  runTestSuite,
  runCoverageTests,
  generateTestReport,
  displaySummary,
}
