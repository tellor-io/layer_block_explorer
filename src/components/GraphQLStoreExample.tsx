import React from 'react'
import { useGraphQLStore } from '../hooks/useGraphQLStore'

/**
 * Example component demonstrating GraphQL store usage
 * Shows how to access state and dispatch actions
 */
const GraphQLStoreExample: React.FC = () => {
  const {
    connection,
    errors,
    performance,
    dataSourcePriority,
    fallbackUsage,
    cacheStats,
    actions,
  } = useGraphQLStore()

  const handleTestConnection = () => {
    actions.setConnectionStatus({
      isConnected: true,
      currentEndpoint: 'https://indexer.tellorlayer.com/graphql',
      lastHealthCheck: Date.now(),
    })
  }

  const handleTestQuery = () => {
    const queryKey = 'test-query-' + Date.now()
    actions.setQueryLoading(queryKey, true)

    // Simulate query execution
    setTimeout(() => {
      actions.setQueryCache(queryKey, { test: 'data' })
      actions.recordQueryTime(150, 'test-query')
    }, 100)
  }

  const handleTestError = () => {
    actions.setGraphQLError(
      'Test error message',
      'test-query',
      'https://indexer.tellorlayer.com/graphql'
    )
  }

  const handleTestFallback = () => {
    actions.recordFallback(
      'GraphQL endpoint unavailable',
      'https://indexer.tellorlayer.com/graphql'
    )
  }

  const handleSwitchDataSource = () => {
    const newPriority = dataSourcePriority === 'graphql' ? 'rpc' : 'graphql'
    actions.setDataSourcePriority(newPriority)
  }

  const handleReset = () => {
    actions.resetGraphQLState()
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">GraphQL Store Example</h2>

      {/* Connection Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Connected:</span>{' '}
            {connection.isConnected ? 'Yes' : 'No'}
          </div>
          <div>
            <span className="font-medium">Endpoint:</span>{' '}
            {connection.currentEndpoint || 'None'}
          </div>
          <div>
            <span className="font-medium">Last Health Check:</span>{' '}
            {new Date(connection.lastHealthCheck).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Available Endpoints:</span>{' '}
            {connection.availableEndpoints.length}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Performance Metrics</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Total Queries:</span>{' '}
            {performance.totalQueries}
          </div>
          <div>
            <span className="font-medium">Success Rate:</span>{' '}
            {performance.totalQueries > 0
              ? Math.round(
                  (performance.successfulQueries / performance.totalQueries) *
                    100
                )
              : 0}
            %
          </div>
          <div>
            <span className="font-medium">Avg Query Time:</span>{' '}
            {Math.round(performance.averageQueryTime)}ms
          </div>
        </div>
      </div>

      {/* Cache Stats */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Cache Statistics</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Total Cached:</span>{' '}
            {cacheStats.totalCached}
          </div>
          <div>
            <span className="font-medium">Active Queries:</span>{' '}
            {cacheStats.activeQueries}
          </div>
          <div>
            <span className="font-medium">Recent Queries:</span>{' '}
            {cacheStats.recentQueries}
          </div>
        </div>
      </div>

      {/* Data Source Priority */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Data Source Management</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Current Priority:</span>{' '}
            {dataSourcePriority.toUpperCase()}
          </div>
          <div>
            <span className="font-medium">Total Fallbacks:</span>{' '}
            {fallbackUsage.totalFallbacks}
          </div>
        </div>
      </div>

      {/* Error Information */}
      {errors.lastError && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Last Error</h3>
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-800 text-sm">{errors.lastError}</p>
            <p className="text-red-600 text-xs mt-1">
              {new Date(errors.lastErrorTime).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold mb-2">Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleTestConnection}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Test Connection
          </button>
          <button
            onClick={handleTestQuery}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Test Query
          </button>
          <button
            onClick={handleTestError}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          >
            Test Error
          </button>
          <button
            onClick={handleTestFallback}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          >
            Test Fallback
          </button>
          <button
            onClick={handleSwitchDataSource}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          >
            Switch Data Source
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Reset State
          </button>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h4 className="font-semibold mb-2">Usage Instructions:</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>
            • Use{' '}
            <code className="bg-gray-200 px-1 rounded">useGraphQLStore()</code>{' '}
            hook to access store state and actions
          </li>
          <li>• Monitor connection status and performance metrics</li>
          <li>• Track query cache and error states</li>
          <li>• Manage data source priority and fallback usage</li>
          <li>• All actions are automatically dispatched to Redux store</li>
        </ul>
      </div>
    </div>
  )
}

export default GraphQLStoreExample
