import type { LiveDelegation, LiveValidator } from './types'
import { fetchLiveValidators } from './validators'
import {
  fetchValidatorDelegations,
  fetchDelegatorCount,
} from './delegations'

const FRESH_TTL_MS = 30_000
const STALE_TTL_MS = 5 * 60_000
const DELEGATION_TTL_MS = 60_000
const MAX_FULL_DELEGATION_LISTS = 20

type ValidatorsState = {
  data: LiveValidator[] | null
  fetchedAt: number
  error: string | null
  isLoading: boolean
  inflightPromise: Promise<LiveValidator[]> | null
}

type DelegationEntry = {
  delegations: LiveDelegation[] | null
  count: number
  fetchedAt: number
  fullList: boolean
}

type Listener = () => void

class StakingCache {
  private validators: ValidatorsState = {
    data: null,
    fetchedAt: 0,
    error: null,
    isLoading: false,
    inflightPromise: null,
  }

  private delegations = new Map<string, DelegationEntry>()
  private delegationAccessOrder: string[] = []
  private listeners = new Set<Listener>()

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    this.listeners.forEach((l) => l())
  }

  getValidatorsState() {
    const now = Date.now()
    const isStale =
      this.validators.data != null &&
      now - this.validators.fetchedAt > FRESH_TTL_MS
    return {
      validators: this.validators.data || [],
      isLoading: this.validators.isLoading,
      isStale,
      error: this.validators.error,
      fetchedAt: this.validators.fetchedAt,
    }
  }

  getValidators(): LiveValidator[] {
    return this.validators.data || []
  }

  getDelegationEntry(validatorAddress: string): DelegationEntry | undefined {
    return this.delegations.get(validatorAddress)
  }

  async fetchValidators(force = false): Promise<LiveValidator[]> {
    const now = Date.now()
    const age = now - this.validators.fetchedAt

    if (
      !force &&
      this.validators.data &&
      age < FRESH_TTL_MS
    ) {
      return this.validators.data
    }

    if (this.validators.inflightPromise) {
      return this.validators.inflightPromise
    }

    const shouldShowLoading = !this.validators.data
    if (shouldShowLoading) {
      this.validators.isLoading = true
      this.notify()
    }

    const promise = fetchLiveValidators()
      .then((response) => {
        this.validators.data = response.validators
        this.validators.fetchedAt = Date.now()
        this.validators.error = null
        return response.validators
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : 'Failed to fetch validators'
        if (!this.validators.data || now - this.validators.fetchedAt > STALE_TTL_MS) {
          this.validators.error = message
        }
        throw error
      })
      .finally(() => {
        this.validators.isLoading = false
        this.validators.inflightPromise = null
        this.notify()
      })

    this.validators.inflightPromise = promise

    // Stale-while-revalidate: return stale data immediately, refresh in background
    if (!force && this.validators.data && age < STALE_TTL_MS) {
      promise.catch(() => {})
      return this.validators.data
    }

    return promise
  }

  refreshValidators() {
    return this.fetchValidators(true)
  }

  /** Drop all cached staking data (e.g. after network switch). */
  clear() {
    this.validators = {
      data: null,
      fetchedAt: 0,
      error: null,
      isLoading: false,
      inflightPromise: null,
    }
    this.delegations.clear()
    this.delegationAccessOrder = []
    this.notify()
  }

  async fetchDelegatorCount(validatorAddress: string): Promise<number> {
    const existing = this.delegations.get(validatorAddress)
    const now = Date.now()

    if (existing && now - existing.fetchedAt < DELEGATION_TTL_MS) {
      return existing.count
    }

    if (existing?.fullList && existing.delegations) {
      return existing.delegations.length
    }

    const count = await fetchDelegatorCount(validatorAddress)
    this.setDelegationEntry(validatorAddress, {
      delegations: existing?.fullList ? existing.delegations : null,
      count,
      fetchedAt: now,
      fullList: Boolean(existing?.fullList),
    })
    return count
  }

  async fetchFullDelegations(validatorAddress: string): Promise<LiveDelegation[]> {
    const existing = this.delegations.get(validatorAddress)
    const now = Date.now()

    if (
      existing?.fullList &&
      existing.delegations &&
      now - existing.fetchedAt < DELEGATION_TTL_MS
    ) {
      return existing.delegations
    }

    const response = await fetchValidatorDelegations(validatorAddress, false)
    this.setDelegationEntry(validatorAddress, {
      delegations: response.delegations,
      count: response.count,
      fetchedAt: now,
      fullList: true,
    })
    return response.delegations
  }

  private setDelegationEntry(validatorAddress: string, entry: DelegationEntry) {
    this.delegations.set(validatorAddress, entry)
    this.delegationAccessOrder = this.delegationAccessOrder.filter(
      (a) => a !== validatorAddress
    )
    this.delegationAccessOrder.push(validatorAddress)

    while (
      this.delegationAccessOrder.length > MAX_FULL_DELEGATION_LISTS
    ) {
      const oldest = this.delegationAccessOrder.shift()
      if (!oldest) break
      const old = this.delegations.get(oldest)
      if (old?.fullList) {
        this.delegations.set(oldest, {
          delegations: null,
          count: old.count,
          fetchedAt: old.fetchedAt,
          fullList: false,
        })
      }
    }
  }

  async fetchDelegatorCountsBatch(
    addresses: string[],
    concurrency = 4,
    onCount?: (address: string, count: number) => void
  ) {
    const queue = [...addresses]
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const address = queue.shift()
        if (!address) break
        try {
          const count = await this.fetchDelegatorCount(address)
          onCount?.(address, count)
        } catch {
          onCount?.(address, 0)
        }
      }
    })
    await Promise.all(workers)
  }
}

export const stakingCache = new StakingCache()
