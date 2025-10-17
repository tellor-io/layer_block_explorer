import { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  setSubscriptionStatus,
  setSubscriptionError,
  setPollingEnabled,
  setPollingInterval,
  selectSubscriptionStatus,
  selectSubscriptionErrors,
  selectPollingState,
  selectSubscriptionHealth,
} from '../store/streamSlice'
import { GraphQLService } from '../services/graphqlService'

interface UseRealTimeDataOptions {
  enableSubscriptions?: boolean
  enablePollingFallback?: boolean
  pollingInterval?: number
  dataTypes?: ('blocks' | 'transactions' | 'validators' | 'reporters')[]
}

interface UseRealTimeDataReturn {
  isConnected: boolean
  hasErrors: boolean
  healthPercentage: number
  subscriptionStatus: Record<string, string>
  subscriptionErrors: Record<string, string | null>
  enablePolling: () => void
  disablePolling: () => void
  reconnectSubscriptions: () => void
  clearErrors: () => void
}

/**
 * Comprehensive hook for managing real-time data subscriptions and polling fallback
 * Provides unified interface for all real-time data management
 */
export function useRealTimeData({
  enableSubscriptions = true,
  enablePollingFallback = true,
  pollingInterval = 30000, // 30 seconds
  dataTypes = ['blocks', 'transactions', 'validators', 'reporters'],
}: UseRealTimeDataOptions = {}): UseRealTimeDataReturn {
  const dispatch = useDispatch()
  const subscriptionStatus = useSelector(selectSubscriptionStatus)
  const subscriptionErrors = useSelector(selectSubscriptionErrors)
  const pollingState = useSelector(selectPollingState)
  const health = useSelector(selectSubscriptionHealth)

  const pollingIntervals = useRef<Record<string, NodeJS.Timeout | null>>({})
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize subscription status
  useEffect(() => {
    if (!isInitialized) {
      dataTypes.forEach((type) => {
        dispatch(setSubscriptionStatus({ type, status: 'disconnected' }))
        dispatch(setSubscriptionError({ type, error: null }))
      })
      setIsInitialized(true)
    }
  }, [dispatch, dataTypes, isInitialized])

  // Enable polling fallback
  const enablePolling = useCallback(() => {
    dispatch(setPollingEnabled(true))

    dataTypes.forEach((type) => {
      // Clear existing interval if any
      if (pollingIntervals.current[type]) {
        clearInterval(pollingIntervals.current[type]!)
      }

      // Set up polling interval
      const interval = setInterval(async () => {
        try {
          switch (type) {
            case 'blocks':
              await GraphQLService.getBlocks(20, 0)
              break
            case 'transactions':
              await GraphQLService.getTransactions(20, 0)
              break
            case 'validators':
              await GraphQLService.getValidators()
              break
            case 'reporters':
              await GraphQLService.getReporters()
              break
          }
        } catch (error) {
          console.warn(`Polling error for ${type}:`, error)
          dispatch(
            setSubscriptionError({
              type,
              error: error instanceof Error ? error.message : 'Polling failed',
            })
          )
        }
      }, pollingInterval)

      pollingIntervals.current[type] = interval
      dispatch(setPollingInterval({ type, interval }))
    })
  }, [dispatch, dataTypes, pollingInterval])

  // Disable polling
  const disablePolling = useCallback(() => {
    dispatch(setPollingEnabled(false))

    dataTypes.forEach((type) => {
      if (pollingIntervals.current[type]) {
        clearInterval(pollingIntervals.current[type]!)
        pollingIntervals.current[type] = null
        dispatch(setPollingInterval({ type, interval: null }))
      }
    })
  }, [dispatch, dataTypes])

  // Reconnect subscriptions
  const reconnectSubscriptions = useCallback(() => {
    dataTypes.forEach((type) => {
      dispatch(setSubscriptionStatus({ type, status: 'connecting' }))
      dispatch(setSubscriptionError({ type, error: null }))
    })

    // Trigger reconnection by updating subscription status
    setTimeout(() => {
      dataTypes.forEach((type) => {
        dispatch(setSubscriptionStatus({ type, status: 'connected' }))
      })
    }, 1000)
  }, [dispatch, dataTypes])

  // Clear all errors
  const clearErrors = useCallback(() => {
    dataTypes.forEach((type) => {
      dispatch(setSubscriptionError({ type, error: null }))
    })
  }, [dispatch, dataTypes])

  // Auto-enable polling when subscriptions fail
  useEffect(() => {
    if (enablePollingFallback && !pollingState.enabled && health.hasErrors) {
      console.log('Subscriptions have errors, enabling polling fallback')
      enablePolling()
    }
  }, [
    enablePollingFallback,
    pollingState.enabled,
    health.hasErrors,
    enablePolling,
  ])

  // Auto-disable polling when subscriptions are healthy
  useEffect(() => {
    if (pollingState.enabled && health.isHealthy && !health.hasErrors) {
      console.log('Subscriptions are healthy, disabling polling fallback')
      disablePolling()
    }
  }, [pollingState.enabled, health.isHealthy, health.hasErrors, disablePolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dataTypes.forEach((type) => {
        if (pollingIntervals.current[type]) {
          clearInterval(pollingIntervals.current[type]!)
        }
      })
    }
  }, [dataTypes])

  return {
    isConnected: health.connectedCount > 0,
    hasErrors: health.hasErrors,
    healthPercentage: health.healthPercentage,
    subscriptionStatus,
    subscriptionErrors,
    enablePolling,
    disablePolling,
    reconnectSubscriptions,
    clearErrors,
  }
}
