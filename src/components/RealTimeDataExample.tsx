import React, { useState } from 'react'
import {
  useRealTimeBlocks,
  useRealTimeTransactions,
  useRealTimeValidators,
  useRealTimeReporters,
  useRealTimeData,
  useSubscriptionManager,
} from '../hooks'

/**
 * Example component demonstrating Phase 6 real-time data features
 * Shows how to use all the new real-time hooks and subscription management
 */
export function RealTimeDataExample() {
  const [enableSubscriptions, setEnableSubscriptions] = useState(true)
  const [enablePolling, setEnablePolling] = useState(false)

  // Real-time data hooks
  const blocks = useRealTimeBlocks({
    limit: 10,
    enableSubscription: enableSubscriptions,
  })

  const transactions = useRealTimeTransactions({
    limit: 10,
    enableSubscription: enableSubscriptions,
  })

  const validators = useRealTimeValidators({
    enableSubscription: enableSubscriptions,
  })

  const reporters = useRealTimeReporters({
    enableSubscription: enableSubscriptions,
  })

  // Real-time data management
  const realTimeData = useRealTimeData({
    enableSubscriptions,
    enablePollingFallback: enablePolling,
    dataTypes: ['blocks', 'transactions', 'validators', 'reporters'],
  })

  // Subscription manager
  const subscriptionManager = useSubscriptionManager({
    enableAutoReconnect: true,
    reconnectDelay: 5000,
    maxReconnectAttempts: 5,
    enablePollingFallback: true,
  })

  const handleReconnect = () => {
    subscriptionManager.reconnectAll()
  }

  const handleDisconnect = () => {
    subscriptionManager.disconnectAll()
  }

  const handleClearErrors = () => {
    realTimeData.clearErrors()
  }

  const health = subscriptionManager.getSubscriptionHealth()

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Phase 6: Real-time Data Example
      </h1>

      {/* Controls */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Controls</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={enableSubscriptions}
              onChange={(e) => setEnableSubscriptions(e.target.checked)}
              className="mr-2"
            />
            Enable Subscriptions
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={enablePolling}
              onChange={(e) => setEnablePolling(e.target.checked)}
              className="mr-2"
            />
            Enable Polling Fallback
          </label>
          <button
            onClick={handleReconnect}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Reconnect All
          </button>
          <button
            onClick={handleDisconnect}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Disconnect All
          </button>
          <button
            onClick={handleClearErrors}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Clear Errors
          </button>
        </div>
      </div>

      {/* Health Status */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">Subscription Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {health.connected}
            </div>
            <div className="text-sm text-gray-600">Connected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {health.total - health.connected}
            </div>
            <div className="text-sm text-gray-600">Disconnected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {health.healthPercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Health</div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${
                health.hasErrors ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {health.hasErrors ? 'Yes' : 'No'}
            </div>
            <div className="text-sm text-gray-600">Has Errors</div>
          </div>
        </div>
      </div>

      {/* Real-time Data Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blocks */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Real-time Blocks</h3>
          {blocks.isLoading ? (
            <div className="text-gray-500">Loading blocks...</div>
          ) : blocks.error ? (
            <div className="text-red-500">Error: {blocks.error}</div>
          ) : (
            <div>
              <div className="text-sm text-gray-600 mb-2">
                {blocks.blocks.length} blocks loaded
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {blocks.blocks.slice(0, 5).map((block) => (
                  <div
                    key={block.blockHeight}
                    className="text-sm bg-gray-50 p-2 rounded"
                  >
                    <div className="font-mono">Height: {block.blockHeight}</div>
                    <div className="font-mono text-xs text-gray-500">
                      Hash: {block.blockHash?.slice(0, 20)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Real-time Transactions</h3>
          {transactions.isLoading ? (
            <div className="text-gray-500">Loading transactions...</div>
          ) : transactions.error ? (
            <div className="text-red-500">Error: {transactions.error}</div>
          ) : (
            <div>
              <div className="text-sm text-gray-600 mb-2">
                {transactions.transactions.length} transactions loaded
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {transactions.transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="text-sm bg-gray-50 p-2 rounded">
                    <div className="font-mono">
                      ID: {tx.id?.slice(0, 20)}...
                    </div>
                    <div className="font-mono text-xs text-gray-500">
                      Block: {tx.blockHeight}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Validators */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Real-time Validators</h3>
          {validators.isLoading ? (
            <div className="text-gray-500">Loading validators...</div>
          ) : validators.error ? (
            <div className="text-red-500">Error: {validators.error}</div>
          ) : (
            <div>
              <div className="text-sm text-gray-600 mb-2">
                {validators.validators.length} validators loaded
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {validators.validators.slice(0, 5).map((validator) => (
                  <div
                    key={validator.operatorAddress}
                    className="text-sm bg-gray-50 p-2 rounded"
                  >
                    <div className="font-semibold">
                      {validator.description?.moniker || 'Unknown'}
                    </div>
                    <div className="font-mono text-xs text-gray-500">
                      {validator.operatorAddress?.slice(0, 20)}...
                    </div>
                    <div className="text-xs text-gray-500">
                      Status: {validator.bondStatus}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reporters */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Real-time Reporters</h3>
          {reporters.isLoading ? (
            <div className="text-gray-500">Loading reporters...</div>
          ) : reporters.error ? (
            <div className="text-red-500">Error: {reporters.error}</div>
          ) : (
            <div>
              <div className="text-sm text-gray-600 mb-2">
                {reporters.reporters.length} reporters loaded
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {reporters.reporters.slice(0, 5).map((reporter) => (
                  <div
                    key={reporter.id}
                    className="text-sm bg-gray-50 p-2 rounded"
                  >
                    <div className="font-semibold">
                      {reporter.moniker || 'Unknown'}
                    </div>
                    <div className="font-mono text-xs text-gray-500">
                      {reporter.id?.slice(0, 20)}...
                    </div>
                    <div className="text-xs text-gray-500">
                      Jailed: {reporter.jailed ? 'Yes' : 'No'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Status Details */}
      <div className="mt-6 bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">
          Subscription Status Details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(realTimeData.subscriptionStatus).map(
            ([type, status]) => (
              <div key={type} className="text-center">
                <div className="text-sm font-semibold capitalize">{type}</div>
                <div
                  className={`text-lg font-bold ${
                    status === 'connected'
                      ? 'text-green-600'
                      : status === 'error'
                      ? 'text-red-600'
                      : status === 'connecting'
                      ? 'text-yellow-600'
                      : 'text-gray-600'
                  }`}
                >
                  {status}
                </div>
                {realTimeData.subscriptionErrors[type] && (
                  <div className="text-xs text-red-500 mt-1">
                    {realTimeData.subscriptionErrors[type]}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
