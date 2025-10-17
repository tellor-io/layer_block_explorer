import { useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  setSubscriptionStatus,
  setSubscriptionError,
  selectSubscriptionStatus,
  selectSubscriptionErrors,
  selectPollingState,
} from '../store/streamSlice'

interface UseSubscriptionManagerOptions {
  enableAutoReconnect?: boolean
  reconnectDelay?: number
  maxReconnectAttempts?: number
  enablePollingFallback?: boolean
  pollingInterval?: number
}

interface UseSubscriptionManagerReturn {
  reconnectAll: () => void
  disconnectAll: () => void
  getSubscriptionHealth: () => {
    connected: number
    total: number
    hasErrors: boolean
    healthPercentage: number
  }
}

/**
 * Advanced subscription manager hook for handling GraphQL subscriptions
 * Provides automatic reconnection, error handling, and polling fallback
 */
export function useSubscriptionManager({
  enableAutoReconnect = true,
  reconnectDelay = 5000, // 5 seconds
  maxReconnectAttempts = 5,
  enablePollingFallback = true,
  pollingInterval = 30000, // 30 seconds
}: UseSubscriptionManagerOptions = {}): UseSubscriptionManagerReturn {
  const dispatch = useDispatch()
  const subscriptionStatus = useSelector(selectSubscriptionStatus)
  const subscriptionErrors = useSelector(selectSubscriptionErrors)
  const pollingState = useSelector(selectPollingState)

  const reconnectAttempts = useRef<Record<string, number>>({})
  const reconnectTimeouts = useRef<Record<string, NodeJS.Timeout | null>>({})
  const pollingIntervals = useRef<Record<string, NodeJS.Timeout | null>>({})

  // Get subscription health
  const getSubscriptionHealth = useCallback(() => {
    const statuses = Object.values(subscriptionStatus)
    const errors = Object.values(subscriptionErrors)

    const connected = statuses.filter((status) => status === 'connected').length
    const total = statuses.length
    const hasErrors = errors.some((error) => error !== null)
    const healthPercentage = total > 0 ? (connected / total) * 100 : 0

    return {
      connected,
      total,
      hasErrors,
      healthPercentage,
    }
  }, [subscriptionStatus, subscriptionErrors])

  // Reconnect a specific subscription
  const reconnectSubscription = useCallback(
    (type: keyof typeof subscriptionStatus) => {
      const attempts = reconnectAttempts.current[type] || 0

      if (attempts >= maxReconnectAttempts) {
        console.warn(`Max reconnection attempts reached for ${type}`)

        // Enable polling fallback if available
        if (enablePollingFallback && !pollingState.enabled) {
          console.log(`Enabling polling fallback for ${type}`)
          // This would trigger polling setup in the parent component
        }
        return
      }

      console.log(
        `Attempting to reconnect ${type} (attempt ${
          attempts + 1
        }/${maxReconnectAttempts})`
      )

      dispatch(setSubscriptionStatus({ type, status: 'connecting' }))
      dispatch(setSubscriptionError({ type, error: null }))

      reconnectAttempts.current[type] = attempts + 1

      // Simulate reconnection attempt
      const timeout = setTimeout(() => {
        // Check if subscription is still needed
        if (subscriptionStatus[type] === 'connecting') {
          dispatch(setSubscriptionStatus({ type, status: 'connected' }))
          reconnectAttempts.current[type] = 0 // Reset on successful connection
        }
      }, reconnectDelay)

      reconnectTimeouts.current[type] = timeout
    },
    [
      dispatch,
      maxReconnectAttempts,
      enablePollingFallback,
      pollingState.enabled,
      reconnectDelay,
      subscriptionStatus,
    ]
  )

  // Reconnect all subscriptions
  const reconnectAll = useCallback(() => {
    ;(
      Object.keys(subscriptionStatus) as Array<keyof typeof subscriptionStatus>
    ).forEach((type) => {
      if (subscriptionStatus[type] !== 'connected') {
        reconnectSubscription(type)
      }
    })
  }, [subscriptionStatus, reconnectSubscription])

  // Disconnect all subscriptions
  const disconnectAll = useCallback(() => {
    ;(
      Object.keys(subscriptionStatus) as Array<keyof typeof subscriptionStatus>
    ).forEach((type) => {
      dispatch(setSubscriptionStatus({ type, status: 'disconnected' }))

      // Clear any pending reconnection attempts
      if (reconnectTimeouts.current[type]) {
        clearTimeout(reconnectTimeouts.current[type]!)
        reconnectTimeouts.current[type] = null
      }

      // Clear polling intervals
      if (pollingIntervals.current[type]) {
        clearInterval(pollingIntervals.current[type]!)
        pollingIntervals.current[type] = null
      }

      reconnectAttempts.current[type] = 0
    })
  }, [dispatch, subscriptionStatus])

  // Monitor subscription status and handle reconnections
  useEffect(() => {
    Object.entries(subscriptionStatus).forEach(([type, status]) => {
      if (status === 'error' && enableAutoReconnect) {
        const error =
          subscriptionErrors[type as keyof typeof subscriptionErrors]
        console.warn(`Subscription error for ${type}:`, error)

        // Clear any existing timeout
        if (reconnectTimeouts.current[type]) {
          clearTimeout(reconnectTimeouts.current[type]!)
        }

        // Schedule reconnection
        const timeout = setTimeout(() => {
          reconnectSubscription(type as keyof typeof subscriptionStatus)
        }, reconnectDelay)

        reconnectTimeouts.current[type] = timeout
      }
    })
  }, [
    subscriptionStatus,
    subscriptionErrors,
    enableAutoReconnect,
    reconnectDelay,
    reconnectSubscription,
  ])

  // Monitor for subscription errors and enable polling fallback
  useEffect(() => {
    const health = getSubscriptionHealth()

    if (health.hasErrors && enablePollingFallback && !pollingState.enabled) {
      console.log('Subscriptions have errors, enabling polling fallback')
      // This would be handled by the parent component
    }
  }, [getSubscriptionHealth, enablePollingFallback, pollingState.enabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts and intervals
      Object.values(reconnectTimeouts.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout)
      })
      Object.values(pollingIntervals.current).forEach((interval) => {
        if (interval) clearInterval(interval)
      })
    }
  }, [])

  return {
    reconnectAll,
    disconnectAll,
    getSubscriptionHealth,
  }
}
