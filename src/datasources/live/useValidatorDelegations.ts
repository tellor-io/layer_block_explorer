import { useEffect, useState } from 'react'
import { stakingCache } from './stakingCache'
import type { LiveDelegation } from './types'

export function useValidatorDelegations(validatorAddress: string) {
  const [delegations, setDelegations] = useState<LiveDelegation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await stakingCache.fetchFullDelegations(validatorAddress)
        if (!cancelled) setDelegations(data)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch delegations'
          )
          setDelegations([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [validatorAddress])

  return { delegations, isLoading, error }
}
