import { useEffect, useState, useCallback } from 'react'
import { stakingCache } from './stakingCache'
import type { LiveValidator } from './types'

export function useLiveValidators(options?: { pollInterval?: number }) {
  const [, tick] = useState(0)
  const state = stakingCache.getValidatorsState()

  useEffect(() => {
    return stakingCache.subscribe(() => tick((n) => n + 1))
  }, [])

  useEffect(() => {
    stakingCache.fetchValidators().catch(() => {})
  }, [])

  useEffect(() => {
    if (!options?.pollInterval) return
    const id = setInterval(() => {
      stakingCache.refreshValidators().catch(() => {})
    }, options.pollInterval)
    return () => clearInterval(id)
  }, [options?.pollInterval])

  const refresh = useCallback(() => stakingCache.refreshValidators(), [])

  return {
    validators: state.validators as LiveValidator[],
    isLoading: state.isLoading,
    isStale: state.isStale,
    error: state.error,
    refresh,
  }
}
