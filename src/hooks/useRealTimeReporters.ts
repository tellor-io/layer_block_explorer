import { useState, useEffect, useCallback } from 'react'
import { useSubscription } from '@apollo/client'
import { SUBSCRIBE_TO_REPORTER_UPDATES } from '../graphql/subscriptions/reporters'
import { GraphQLService, GraphQLReporter } from '../services/graphqlService'

interface UseRealTimeReportersOptions {
  limit?: number
  offset?: number
  enableSubscription?: boolean
  jailed?: boolean
}

interface UseRealTimeReportersReturn {
  reporters: GraphQLReporter[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for real-time reporter updates
 * Uses existing GraphQL service methods to avoid code duplication
 */
export function useRealTimeReporters({
  limit = 20,
  offset = 0,
  enableSubscription = true,
  jailed,
}: UseRealTimeReportersOptions = {}): UseRealTimeReportersReturn {
  const [reporters, setReporters] = useState<GraphQLReporter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial reporters using the existing GraphQL service
  const fetchReporters = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use the existing GraphQL service method
      const result = await GraphQLService.getReporters()
      setReporters(result)
    } catch (err) {
      console.error('Error fetching reporters:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch reporters')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchReporters()
  }, [fetchReporters])

  // Subscribe to reporter updates in real-time
  const { data: subscriptionData, error: subscriptionError } = useSubscription(
    SUBSCRIBE_TO_REPORTER_UPDATES,
    {
      skip: !enableSubscription,
      onError: (error) => {
        console.warn('Reporter subscription error:', error)
        // Don't set error state for subscription failures, just log them
      },
    }
  )

  // Handle reporter updates from subscription
  useEffect(() => {
    if (subscriptionData?.reporters && enableSubscription) {
      const reporterPayload = subscriptionData.reporters

      // Process both INSERT and UPDATE mutations
      if (
        (reporterPayload.mutation_type === 'INSERT' ||
          reporterPayload.mutation_type === 'UPDATE') &&
        reporterPayload._entity
      ) {
        const updatedReporter = reporterPayload._entity

        // If jailed filter is specified, only update reporters with that status
        if (jailed !== undefined && updatedReporter.jailed !== jailed) {
          return
        }

        setReporters((prevReporters) => {
          // Find and update existing reporter or add new one
          const existingIndex = prevReporters.findIndex(
            (reporter) => reporter.id === updatedReporter.id
          )

          if (existingIndex >= 0) {
            // Update existing reporter
            const updated = [...prevReporters]
            updated[existingIndex] = updatedReporter
            return updated
          } else {
            // Add new reporter to the beginning and maintain the limit
            return [updatedReporter, ...prevReporters.slice(0, limit - 1)]
          }
        })
      }
    }
  }, [subscriptionData, enableSubscription, limit, jailed])

  // Handle subscription errors (non-blocking)
  useEffect(() => {
    if (subscriptionError) {
      console.warn('Reporter subscription error:', subscriptionError)
      // Note: We don't set the error state for subscription failures
      // as they shouldn't break the main functionality
    }
  }, [subscriptionError])

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    await fetchReporters()
  }, [fetchReporters])

  return {
    reporters,
    isLoading,
    error,
    refetch,
  }
}
