import { NextApiRequest, NextApiResponse } from 'next'
import { graphqlClientManager } from '../../../utils/graphqlClient'
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
    // Get current GraphQL endpoint
    endpoint = await graphqlClientManager.getCurrentEndpoint()

    // Test GraphQL connection with a simple introspection query
    const client = await graphqlClientManager.getOrCreateClient()

    const testQuery = await client.query({
      query: require('graphql-tag')(`
        query HealthCheck {
          __schema {
            types {
              name
            }
          }
        }
      `),
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    })

    if (testQuery.data && testQuery.data.__schema) {
      isHealthy = true
    } else {
      error = 'GraphQL introspection query failed'
    }
  } catch (err) {
    error =
      err instanceof Error ? err.message : 'Unknown GraphQL health check error'
    console.error('GraphQL health check failed:', err)
  } finally {
    responseTime = Date.now() - startTime
  }

  // Record health check event
  recordHealthCheck(DataSourceType.GRAPHQL, isHealthy, responseTime, endpoint)

  // Get current metrics
  const metrics = monitoringService.getMetrics(DataSourceType.GRAPHQL)
  const recentErrors = monitoringService.getEventsByType(
    DataSourceType.GRAPHQL,
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
