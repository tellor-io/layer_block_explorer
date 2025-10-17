import { DataSourceType } from './dataSourceManager'

export interface MonitoringEvent {
  id: string
  timestamp: number
  type: 'query' | 'error' | 'fallback' | 'health_check' | 'performance'
  source: DataSourceType
  endpoint?: string
  query?: string
  duration?: number
  error?: string
  metadata?: Record<string, any>
}

export interface PerformanceMetrics {
  totalQueries: number
  successfulQueries: number
  failedQueries: number
  averageResponseTime: number
  totalResponseTime: number
  cacheHitRate: number
  fallbackRate: number
  errorRate: number
  lastUpdated: number
}

export interface HealthStatus {
  isHealthy: boolean
  lastCheck: number
  responseTime: number
  errorCount: number
  successCount: number
  uptime: number
}

export interface DataSourceMetrics {
  graphql: {
    performance: PerformanceMetrics
    health: HealthStatus
    events: MonitoringEvent[]
  }
  rpc: {
    performance: PerformanceMetrics
    health: HealthStatus
    events: MonitoringEvent[]
  }
}

class MonitoringService {
  private static instance: MonitoringService
  private events: MonitoringEvent[] = []
  private metrics: DataSourceMetrics
  private maxEvents = 1000
  private healthCheckInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.metrics = {
      graphql: {
        performance: {
          totalQueries: 0,
          successfulQueries: 0,
          failedQueries: 0,
          averageResponseTime: 0,
          totalResponseTime: 0,
          cacheHitRate: 0,
          fallbackRate: 0,
          errorRate: 0,
          lastUpdated: Date.now(),
        },
        health: {
          isHealthy: true,
          lastCheck: Date.now(),
          responseTime: 0,
          errorCount: 0,
          successCount: 0,
          uptime: 100,
        },
        events: [],
      },
      rpc: {
        performance: {
          totalQueries: 0,
          successfulQueries: 0,
          failedQueries: 0,
          averageResponseTime: 0,
          totalResponseTime: 0,
          cacheHitRate: 0,
          fallbackRate: 0,
          errorRate: 0,
          lastUpdated: Date.now(),
        },
        health: {
          isHealthy: true,
          lastCheck: Date.now(),
          responseTime: 0,
          errorCount: 0,
          successCount: 0,
          uptime: 100,
        },
        events: [],
      },
    }

    this.startHealthMonitoring()
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  /**
   * Record a query event
   */
  public recordQuery(
    source: DataSourceType,
    query: string,
    duration: number,
    success: boolean,
    endpoint?: string,
    metadata?: Record<string, any>
  ): void {
    const event: MonitoringEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      type: 'query',
      source,
      query,
      duration,
      endpoint,
      metadata,
    }

    this.addEvent(event)
    this.updatePerformanceMetrics(source, duration, success)
  }

  /**
   * Record an error event
   */
  public recordError(
    source: DataSourceType,
    error: string,
    query?: string,
    endpoint?: string,
    metadata?: Record<string, any>
  ): void {
    const event: MonitoringEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      type: 'error',
      source,
      query,
      error,
      endpoint,
      metadata,
    }

    this.addEvent(event)
    this.updateErrorMetrics(source)
  }

  /**
   * Record a fallback event
   */
  public recordFallback(
    fromSource: DataSourceType,
    toSource: DataSourceType,
    reason: string,
    query?: string,
    metadata?: Record<string, any>
  ): void {
    const event: MonitoringEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      type: 'fallback',
      source: toSource,
      query,
      error: reason,
      metadata: {
        ...metadata,
        fromSource,
        toSource,
        reason,
      },
    }

    this.addEvent(event)
    this.updateFallbackMetrics(fromSource, toSource)
  }

  /**
   * Record a health check event
   */
  public recordHealthCheck(
    source: DataSourceType,
    isHealthy: boolean,
    responseTime: number,
    endpoint?: string
  ): void {
    const event: MonitoringEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      type: 'health_check',
      source,
      endpoint,
      duration: responseTime,
      metadata: { isHealthy },
    }

    this.addEvent(event)
    this.updateHealthMetrics(source, isHealthy, responseTime)
  }

  /**
   * Get current metrics for a data source
   */
  public getMetrics(source: DataSourceType): {
    performance: PerformanceMetrics
    health: HealthStatus
    events: MonitoringEvent[]
  } {
    return this.metrics[source]
  }

  /**
   * Get all metrics
   */
  public getAllMetrics(): DataSourceMetrics {
    return this.metrics
  }

  /**
   * Get recent events for a data source
   */
  public getRecentEvents(
    source: DataSourceType,
    limit: number = 50
  ): MonitoringEvent[] {
    return this.metrics[source].events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Get events by type
   */
  public getEventsByType(
    source: DataSourceType,
    type: MonitoringEvent['type'],
    limit: number = 50
  ): MonitoringEvent[] {
    return this.metrics[source].events
      .filter((event) => event.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    graphql: PerformanceMetrics
    rpc: PerformanceMetrics
    overall: {
      totalQueries: number
      averageResponseTime: number
      errorRate: number
      fallbackRate: number
    }
  } {
    const graphql = this.metrics.graphql.performance
    const rpc = this.metrics.rpc.performance

    return {
      graphql,
      rpc,
      overall: {
        totalQueries: graphql.totalQueries + rpc.totalQueries,
        averageResponseTime:
          (graphql.averageResponseTime + rpc.averageResponseTime) / 2,
        errorRate: (graphql.errorRate + rpc.errorRate) / 2,
        fallbackRate: graphql.fallbackRate,
      },
    }
  }

  /**
   * Export metrics for external monitoring
   */
  public exportMetrics(): {
    timestamp: number
    metrics: DataSourceMetrics
    summary: any
  } {
    return {
      timestamp: Date.now(),
      metrics: this.metrics,
      summary: this.getPerformanceSummary(),
    }
  }

  /**
   * Clear old events to prevent memory leaks
   */
  public cleanup(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago

    Object.keys(this.metrics).forEach((source) => {
      const sourceKey = source as DataSourceType
      this.metrics[sourceKey].events = this.metrics[sourceKey].events.filter(
        (event) => event.timestamp > cutoffTime
      )
    })
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000) // Cleanup every 5 minutes
  }

  /**
   * Add event to the appropriate source
   */
  private addEvent(event: MonitoringEvent): void {
    this.metrics[event.source].events.push(event)

    // Keep only the most recent events
    if (this.metrics[event.source].events.length > this.maxEvents) {
      this.metrics[event.source].events = this.metrics[event.source].events
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.maxEvents)
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(
    source: DataSourceType,
    duration: number,
    success: boolean
  ): void {
    const metrics = this.metrics[source].performance

    metrics.totalQueries++
    metrics.totalResponseTime += duration
    metrics.averageResponseTime =
      metrics.totalResponseTime / metrics.totalQueries
    metrics.lastUpdated = Date.now()

    if (success) {
      metrics.successfulQueries++
    } else {
      metrics.failedQueries++
    }

    metrics.errorRate = (metrics.failedQueries / metrics.totalQueries) * 100
  }

  /**
   * Update error metrics
   */
  private updateErrorMetrics(source: DataSourceType): void {
    const metrics = this.metrics[source].performance
    metrics.failedQueries++
    metrics.errorRate = (metrics.failedQueries / metrics.totalQueries) * 100
    metrics.lastUpdated = Date.now()
  }

  /**
   * Update fallback metrics
   */
  private updateFallbackMetrics(
    fromSource: DataSourceType,
    toSource: DataSourceType
  ): void {
    const metrics = this.metrics[fromSource].performance
    metrics.fallbackRate =
      (metrics.fallbackRate * metrics.totalQueries + 1) / metrics.totalQueries
    metrics.lastUpdated = Date.now()
  }

  /**
   * Update health metrics
   */
  private updateHealthMetrics(
    source: DataSourceType,
    isHealthy: boolean,
    responseTime: number
  ): void {
    const health = this.metrics[source].health

    health.isHealthy = isHealthy
    health.lastCheck = Date.now()
    health.responseTime = responseTime

    if (isHealthy) {
      health.successCount++
    } else {
      health.errorCount++
    }

    const totalChecks = health.successCount + health.errorCount
    health.uptime =
      totalChecks > 0 ? (health.successCount / totalChecks) * 100 : 100
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Destroy the monitoring service
   */
  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance()

// Export convenience functions
export const recordQuery = (
  source: DataSourceType,
  query: string,
  duration: number,
  success: boolean,
  endpoint?: string,
  metadata?: Record<string, any>
) =>
  monitoringService.recordQuery(
    source,
    query,
    duration,
    success,
    endpoint,
    metadata
  )

export const recordError = (
  source: DataSourceType,
  error: string,
  query?: string,
  endpoint?: string,
  metadata?: Record<string, any>
) => monitoringService.recordError(source, error, query, endpoint, metadata)

export const recordFallback = (
  fromSource: DataSourceType,
  toSource: DataSourceType,
  reason: string,
  query?: string,
  metadata?: Record<string, any>
) =>
  monitoringService.recordFallback(
    fromSource,
    toSource,
    reason,
    query,
    metadata
  )

export const recordHealthCheck = (
  source: DataSourceType,
  isHealthy: boolean,
  responseTime: number,
  endpoint?: string
) =>
  monitoringService.recordHealthCheck(source, isHealthy, responseTime, endpoint)

export const getMetrics = (source: DataSourceType) =>
  monitoringService.getMetrics(source)
export const getAllMetrics = () => monitoringService.getAllMetrics()
export const getRecentEvents = (source: DataSourceType, limit?: number) =>
  monitoringService.getRecentEvents(source, limit)
export const getEventsByType = (
  source: DataSourceType,
  type: MonitoringEvent['type'],
  limit?: number
) => monitoringService.getEventsByType(source, type, limit)
export const getPerformanceSummary = () =>
  monitoringService.getPerformanceSummary()
export const exportMetrics = () => monitoringService.exportMetrics()
