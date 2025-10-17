import { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '../../../utils/rpcManager'
import { monitoringService, recordHealthCheck } from '../../../utils/monitoring'
import { DataSourceType } from '../../../utils/dataSourceManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  let isHealthy = false
  let responseTime = 0
  let error: string | null = null
  let endpoint = ''

  try {
    // Get current RPC endpoint
    endpoint = await rpcManager.getCurrentEndpoint()

    // Test RPC connection with a simple status query
    const response = await fetch(`${endpoint}/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (response.ok) {
      const data = await response.json()
      if (data.result && data.result.node_info) {
        isHealthy = true
      } else {
        error = 'RPC status response invalid'
      }
    } else {
      error = `RPC health check failed with status ${response.status}`
    }
  } catch (err) {
    error =
      err instanceof Error ? err.message : 'Unknown RPC health check error'
    console.error('RPC health check failed:', err)
  } finally {
    responseTime = Date.now() - startTime
  }

  // Record health check event
  recordHealthCheck(DataSourceType.RPC, isHealthy, responseTime, endpoint)

  // Get current metrics
  const metrics = monitoringService.getMetrics(DataSourceType.RPC)
  const recentErrors = monitoringService.getEventsByType(
    DataSourceType.RPC,
    'error',
    10
  )

  const healthStatus = {
    isHealthy,
    responseTime,
    endpoint,
    timestamp: Date.now(),
    error,
    metrics: {
      performance: metrics.performance,
      health: metrics.health,
    },
    recentErrors: recentErrors.map((event) => ({
      timestamp: event.timestamp,
      error: event.error,
      query: event.query,
      endpoint: event.endpoint,
    })),
    uptime: metrics.health.uptime,
    lastCheck: metrics.health.lastCheck,
  }

  const statusCode = isHealthy ? 200 : 503
  res.status(statusCode).json(healthStatus)
}
