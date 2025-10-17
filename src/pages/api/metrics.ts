import { NextApiRequest, NextApiResponse } from 'next'
import { monitoringService } from '../../utils/monitoring'
import { DataSourceType } from '../../utils/dataSourceManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { source, type, limit, format } = req.query

    // Get all metrics by default
    if (!source) {
      const allMetrics = monitoringService.getAllMetrics()
      const performanceSummary = monitoringService.getPerformanceSummary()
      const exportedMetrics = monitoringService.exportMetrics()

      const response = {
        timestamp: Date.now(),
        summary: performanceSummary,
        metrics: allMetrics,
        export: exportedMetrics,
      }

      return res.status(200).json(response)
    }

    // Get metrics for specific source
    const dataSource = source as DataSourceType
    if (!Object.values(DataSourceType).includes(dataSource)) {
      return res.status(400).json({ error: 'Invalid data source' })
    }

    const metrics = monitoringService.getMetrics(dataSource)
    const limitNum = limit ? parseInt(limit as string) : 50

    let events = []
    if (type) {
      events = monitoringService.getEventsByType(
        dataSource,
        type as any,
        limitNum
      )
    } else {
      events = monitoringService.getRecentEvents(dataSource, limitNum)
    }

    const response = {
      timestamp: Date.now(),
      source: dataSource,
      metrics: {
        performance: metrics.performance,
        health: metrics.health,
      },
      events: events.map((event) => ({
        id: event.id,
        timestamp: event.timestamp,
        type: event.type,
        source: event.source,
        endpoint: event.endpoint,
        query: event.query,
        duration: event.duration,
        error: event.error,
        metadata: event.metadata,
      })),
      statistics: {
        totalEvents: events.length,
        eventTypes: events.reduce((acc, event) => {
          acc[event.type] = (acc[event.type] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        timeRange:
          events.length > 0
            ? {
                oldest: Math.min(...events.map((e) => e.timestamp)),
                newest: Math.max(...events.map((e) => e.timestamp)),
              }
            : null,
      },
    }

    // Return in different formats
    if (format === 'csv') {
      const csv = convertToCSV(events)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="metrics.csv"')
      return res.status(200).send(csv)
    }

    if (format === 'prometheus') {
      const prometheus = convertToPrometheus(metrics)
      res.setHeader('Content-Type', 'text/plain')
      return res.status(200).send(prometheus)
    }

    res.status(200).json(response)
  } catch (error) {
    console.error('Metrics API error:', error)
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    })
  }
}

function convertToCSV(events: any[]): string {
  if (events.length === 0) {
    return 'timestamp,type,source,endpoint,query,duration,error\n'
  }

  const headers = [
    'timestamp',
    'type',
    'source',
    'endpoint',
    'query',
    'duration',
    'error',
  ]
  const csvRows = [headers.join(',')]

  events.forEach((event) => {
    const row = headers.map((header) => {
      const value = event[header] || ''
      // Escape commas and quotes in CSV
      return `"${String(value).replace(/"/g, '""')}"`
    })
    csvRows.push(row.join(','))
  })

  return csvRows.join('\n')
}

function convertToPrometheus(metrics: any): string {
  const lines: string[] = []

  // Performance metrics
  lines.push(`# HELP graphql_queries_total Total number of GraphQL queries`)
  lines.push(`# TYPE graphql_queries_total counter`)
  lines.push(
    `graphql_queries_total{source="graphql"} ${metrics.performance.totalQueries}`
  )

  lines.push(
    `# HELP graphql_queries_successful_total Total number of successful GraphQL queries`
  )
  lines.push(`# TYPE graphql_queries_successful_total counter`)
  lines.push(
    `graphql_queries_successful_total{source="graphql"} ${metrics.performance.successfulQueries}`
  )

  lines.push(
    `# HELP graphql_queries_failed_total Total number of failed GraphQL queries`
  )
  lines.push(`# TYPE graphql_queries_failed_total counter`)
  lines.push(
    `graphql_queries_failed_total{source="graphql"} ${metrics.performance.failedQueries}`
  )

  lines.push(
    `# HELP graphql_response_time_seconds Average GraphQL response time in seconds`
  )
  lines.push(`# TYPE graphql_response_time_seconds gauge`)
  lines.push(
    `graphql_response_time_seconds{source="graphql"} ${
      metrics.performance.averageResponseTime / 1000
    }`
  )

  lines.push(`# HELP graphql_error_rate_percent GraphQL error rate percentage`)
  lines.push(`# TYPE graphql_error_rate_percent gauge`)
  lines.push(
    `graphql_error_rate_percent{source="graphql"} ${metrics.performance.errorRate}`
  )

  lines.push(
    `# HELP graphql_fallback_rate_percent GraphQL fallback rate percentage`
  )
  lines.push(`# TYPE graphql_fallback_rate_percent gauge`)
  lines.push(
    `graphql_fallback_rate_percent{source="graphql"} ${metrics.performance.fallbackRate}`
  )

  // Health metrics
  lines.push(
    `# HELP graphql_health_status GraphQL health status (1=healthy, 0=unhealthy)`
  )
  lines.push(`# TYPE graphql_health_status gauge`)
  lines.push(
    `graphql_health_status{source="graphql"} ${
      metrics.health.isHealthy ? 1 : 0
    }`
  )

  lines.push(`# HELP graphql_uptime_percent GraphQL uptime percentage`)
  lines.push(`# TYPE graphql_uptime_percent gauge`)
  lines.push(
    `graphql_uptime_percent{source="graphql"} ${metrics.health.uptime}`
  )

  lines.push(
    `# HELP graphql_last_check_timestamp GraphQL last health check timestamp`
  )
  lines.push(`# TYPE graphql_last_check_timestamp gauge`)
  lines.push(
    `graphql_last_check_timestamp{source="graphql"} ${
      metrics.health.lastCheck / 1000
    }`
  )

  return lines.join('\n')
}
