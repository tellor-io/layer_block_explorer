import { NextApiRequest, NextApiResponse } from 'next'
import { monitoringService } from '../../../utils/monitoring'
import { dataSourceManager } from '../../../utils/dataSourceManager'
import { DataSourceType } from '../../../utils/dataSourceManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get overall system health
    const allMetrics = monitoringService.getAllMetrics()
    const performanceSummary = monitoringService.getPerformanceSummary()

    // Get data source status
    const dataSourceStatus = dataSourceManager.getStatus()
    const graphqlStatus = dataSourceStatus.get(DataSourceType.GRAPHQL)
    const rpcStatus = dataSourceStatus.get(DataSourceType.RPC)

    // Calculate overall system health
    const graphqlHealthy = allMetrics.graphql.health.isHealthy
    const rpcHealthy = allMetrics.rpc.health.isHealthy
    const overallHealthy = graphqlHealthy || rpcHealthy // System is healthy if at least one source is working

    // Get recent events
    const recentGraphQLEvents = monitoringService.getRecentEvents(
      DataSourceType.GRAPHQL,
      20
    )
    const recentRPCEvents = monitoringService.getRecentEvents(
      DataSourceType.RPC,
      20
    )
    const recentErrors = [
      ...monitoringService.getEventsByType(DataSourceType.GRAPHQL, 'error', 10),
      ...monitoringService.getEventsByType(DataSourceType.RPC, 'error', 10),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)

    const recentFallbacks = [
      ...monitoringService.getEventsByType(
        DataSourceType.GRAPHQL,
        'fallback',
        10
      ),
      ...monitoringService.getEventsByType(DataSourceType.RPC, 'fallback', 10),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)

    const healthStatus = {
      overall: {
        isHealthy: overallHealthy,
        timestamp: Date.now(),
        primarySource: graphqlHealthy ? 'graphql' : 'rpc',
        fallbackActive: !graphqlHealthy && rpcHealthy,
      },
      dataSources: {
        graphql: {
          isHealthy: graphqlHealthy,
          status: graphqlStatus,
          metrics: allMetrics.graphql,
          recentEvents: recentGraphQLEvents.slice(0, 10),
        },
        rpc: {
          isHealthy: rpcHealthy,
          status: rpcStatus,
          metrics: allMetrics.rpc,
          recentEvents: recentRPCEvents.slice(0, 10),
        },
      },
      performance: performanceSummary,
      recentActivity: {
        errors: recentErrors.map((event) => ({
          timestamp: event.timestamp,
          source: event.source,
          error: event.error,
          query: event.query,
          endpoint: event.endpoint,
        })),
        fallbacks: recentFallbacks.map((event) => ({
          timestamp: event.timestamp,
          fromSource: event.metadata?.fromSource,
          toSource: event.metadata?.toSource,
          reason: event.metadata?.reason,
          query: event.query,
        })),
      },
      recommendations: generateRecommendations(allMetrics, performanceSummary),
    }

    const statusCode = overallHealthy ? 200 : 503
    res.status(statusCode).json(healthStatus)
  } catch (error) {
    console.error('Overall health check failed:', error)
    res.status(500).json({
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    })
  }
}

function generateRecommendations(metrics: any, performance: any): string[] {
  const recommendations: string[] = []

  // Check error rates
  if (metrics.graphql.performance.errorRate > 10) {
    recommendations.push(
      'GraphQL error rate is high (>10%). Consider investigating network issues or query optimization.'
    )
  }

  if (metrics.rpc.performance.errorRate > 10) {
    recommendations.push(
      'RPC error rate is high (>10%). Consider checking RPC endpoint health.'
    )
  }

  // Check response times
  if (metrics.graphql.performance.averageResponseTime > 5000) {
    recommendations.push(
      'GraphQL response times are slow (>5s). Consider optimizing queries or checking network latency.'
    )
  }

  if (metrics.rpc.performance.averageResponseTime > 5000) {
    recommendations.push(
      'RPC response times are slow (>5s). Consider checking RPC endpoint performance.'
    )
  }

  // Check fallback rate
  if (performance.overall.fallbackRate > 20) {
    recommendations.push(
      'High fallback rate detected. Consider investigating primary data source issues.'
    )
  }

  // Check uptime
  if (metrics.graphql.health.uptime < 95) {
    recommendations.push(
      'GraphQL uptime is below 95%. Consider investigating stability issues.'
    )
  }

  if (metrics.rpc.health.uptime < 95) {
    recommendations.push(
      'RPC uptime is below 95%. Consider investigating stability issues.'
    )
  }

  // Check if both sources are unhealthy
  if (!metrics.graphql.health.isHealthy && !metrics.rpc.health.isHealthy) {
    recommendations.push(
      'CRITICAL: Both data sources are unhealthy. Immediate attention required.'
    )
  }

  return recommendations
}
