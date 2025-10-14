import { useState, useEffect, useCallback } from 'react'
import { useSubscription, DocumentNode, ApolloError } from '@apollo/client'

interface UseRealTimeDataOptions {
  skip?: boolean
  onData?: (data: any) => void
  onError?: (error: ApolloError) => void
  enableSubscription?: boolean
  errorPolicy?: 'none' | 'ignore' | 'all'
}

interface UseRealTimeDataReturn<T> {
  data: T | undefined
  loading: boolean
  error: ApolloError | undefined
  isSubscribed: boolean
  lastUpdate: Date | null
  subscriptionCount: number
}

/**
 * Real-time data hook for GraphQL subscriptions
 * Provides real-time updates via GraphQL subscriptions with error handling
 * Uses Apollo Client 3.14.0 with enhanced error handling
 */
export function useRealTimeData<T = any>(
  subscription: DocumentNode,
  variables?: any,
  options: UseRealTimeDataOptions = {}
): UseRealTimeDataReturn<T> {
  const {
    skip = false,
    onData,
    onError,
    enableSubscription = true,
    errorPolicy = 'none',
  } = options

  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApolloError | undefined>(undefined)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [subscriptionCount, setSubscriptionCount] = useState(0)

  // GraphQL subscription
  const { data: subscriptionData, error: subscriptionError, loading: subscriptionLoading } = useSubscription(
    subscription,
    {
      variables,
      skip: skip || !enableSubscription,
      errorPolicy,
      onError: (subscriptionError) => {
        console.warn('Subscription error:', subscriptionError)
        setError(subscriptionError)
        onError?.(subscriptionError)
      },
    }
  )

  // Handle subscription data updates
  useEffect(() => {
    if (subscriptionData && enableSubscription) {
      setData(subscriptionData)
      setLastUpdate(new Date())
      setSubscriptionCount(prev => prev + 1)
      setError(undefined)
      setLoading(false)
      
      // Call custom onData handler if provided
      onData?.(subscriptionData)
    }
  }, [subscriptionData, enableSubscription, onData])

  // Handle subscription errors
  useEffect(() => {
    if (subscriptionError) {
      setError(subscriptionError)
      setLoading(false)
      onError?.(subscriptionError)
    }
  }, [subscriptionError, onError])

  // Handle loading state
  useEffect(() => {
    setLoading(subscriptionLoading)
  }, [subscriptionLoading])

  // Reset error when subscription is enabled/disabled
  useEffect(() => {
    if (enableSubscription) {
      setError(undefined)
    }
  }, [enableSubscription])

  // Manual data update function
  const updateData = useCallback((newData: T) => {
    setData(newData)
    setLastUpdate(new Date())
    setSubscriptionCount(prev => prev + 1)
    setError(undefined)
    setLoading(false)
  }, [])

  // Manual error clear function
  const clearError = useCallback(() => {
    setError(undefined)
  }, [])

  return {
    data,
    loading,
    error,
    isSubscribed: enableSubscription && !skip,
    lastUpdate,
    subscriptionCount,
  }
}
