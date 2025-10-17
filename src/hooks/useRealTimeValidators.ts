import { useState, useEffect, useCallback } from 'react'
import { useSubscription } from '@apollo/client'
import { SUBSCRIBE_TO_VALIDATOR_UPDATES } from '../graphql/subscriptions/validators'
import { GraphQLService, GraphQLValidator } from '../services/graphqlService'

interface UseRealTimeValidatorsOptions {
  limit?: number
  offset?: number
  enableSubscription?: boolean
  bondStatus?: string
}

interface UseRealTimeValidatorsReturn {
  validators: GraphQLValidator[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for real-time validator updates
 * Uses existing GraphQL service methods to avoid code duplication
 */
export function useRealTimeValidators({
  limit = 20,
  offset = 0,
  enableSubscription = true,
  bondStatus,
}: UseRealTimeValidatorsOptions = {}): UseRealTimeValidatorsReturn {
  const [validators, setValidators] = useState<GraphQLValidator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial validators using the existing GraphQL service
  const fetchValidators = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use the existing GraphQL service method
      const result = await GraphQLService.getValidators()
      setValidators(result)
    } catch (err) {
      console.error('Error fetching validators:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch validators'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchValidators()
  }, [fetchValidators])

  // Subscribe to validator updates in real-time
  const { data: subscriptionData, error: subscriptionError } = useSubscription(
    SUBSCRIBE_TO_VALIDATOR_UPDATES,
    {
      skip: !enableSubscription,
      onError: (error) => {
        console.warn('Validator subscription error:', error)
        // Don't set error state for subscription failures, just log them
      },
    }
  )

  // Handle validator updates from subscription
  useEffect(() => {
    if (subscriptionData?.validators && enableSubscription) {
      const validatorPayload = subscriptionData.validators

      // Process both INSERT and UPDATE mutations
      if (
        (validatorPayload.mutation_type === 'INSERT' ||
          validatorPayload.mutation_type === 'UPDATE') &&
        validatorPayload._entity
      ) {
        const updatedValidator = validatorPayload._entity

        // If bondStatus filter is specified, only update validators with that status
        if (bondStatus && updatedValidator.bondStatus !== bondStatus) {
          return
        }

        setValidators((prevValidators) => {
          // Find and update existing validator or add new one
          const existingIndex = prevValidators.findIndex(
            (validator) =>
              validator.operatorAddress === updatedValidator.operatorAddress
          )

          if (existingIndex >= 0) {
            // Update existing validator
            const updated = [...prevValidators]
            updated[existingIndex] = updatedValidator
            return updated
          } else {
            // Add new validator to the beginning and maintain the limit
            return [updatedValidator, ...prevValidators.slice(0, limit - 1)]
          }
        })
      }
    }
  }, [subscriptionData, enableSubscription, limit, bondStatus])

  // Handle subscription errors (non-blocking)
  useEffect(() => {
    if (subscriptionError) {
      console.warn('Validator subscription error:', subscriptionError)
      // Note: We don't set the error state for subscription failures
      // as they shouldn't break the main functionality
    }
  }, [subscriptionError])

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    await fetchValidators()
  }, [fetchValidators])

  return {
    validators,
    isLoading,
    error,
    refetch,
  }
}
