import type { LiveDelegation, LiveDelegationsResponse } from './types'

export function normalizeDelegation(raw: Record<string, unknown>): LiveDelegation {
  const balance = raw.balance as { denom?: string; amount?: string } | undefined
  return {
    delegatorAddress: String(raw.delegator_address || raw.delegatorAddress || ''),
    validatorAddress: String(raw.validator_address || raw.validatorAddress || ''),
    shares: String(raw.shares || '0'),
    balance: balance
      ? { denom: balance.denom || 'loya', amount: balance.amount || '0' }
      : undefined,
  }
}

export async function fetchValidatorDelegations(
  validatorAddress: string,
  countOnly = false
): Promise<LiveDelegationsResponse> {
  const params = countOnly ? '?countOnly=true' : ''
  const response = await fetch(
    `/api/validator-delegations/${encodeURIComponent(validatorAddress)}/live${params}`
  )
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.details || body.error || 'Failed to fetch delegations')
  }
  return response.json()
}

export async function fetchDelegatorCount(validatorAddress: string): Promise<number> {
  const result = await fetchValidatorDelegations(validatorAddress, true)
  return result.count
}

export function mapDelegationToChartRow(delegation: LiveDelegation) {
  return {
    delegatorAddress: delegation.delegatorAddress,
    validatorAddress: delegation.validatorAddress,
    shares: delegation.shares,
  }
}
