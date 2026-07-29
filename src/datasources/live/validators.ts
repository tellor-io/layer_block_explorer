import { convertRateToPercent } from '@/utils/helper'
import type { LiveValidator, LiveValidatorsResponse } from './types'

export function bondStatusToNum(bondStatus: string): number {
  switch (bondStatus) {
    case 'BOND_STATUS_BONDED':
      return 3
    case 'BOND_STATUS_UNBONDING':
      return 2
    case 'BOND_STATUS_UNBONDED':
      return 1
    default:
      return 0
  }
}

export function normalizeValidator(raw: Record<string, unknown>): LiveValidator {
  const description = (raw.description as Record<string, string>) || {}
  const commission = (raw.commission as Record<string, unknown>) || {}
  const rates =
    (commission.commission_rates as Record<string, string>) ||
    (commission.commissionRates as Record<string, string>) ||
    {}

  // Cosmos staking REST uses `status` (e.g. BOND_STATUS_BONDED), not bond_status
  const bondStatus = String(
    raw.status || raw.bond_status || raw.bondStatus || ''
  )

  return {
    operatorAddress: String(raw.operator_address || raw.operatorAddress || ''),
    consensusPubkey: raw.consensus_pubkey || raw.consensusPubkey,
    bondStatus,
    bondStatusNum: bondStatusToNum(bondStatus),
    tokens: String(raw.tokens || '0'),
    jailed: Boolean(raw.jailed),
    commission: {
      commissionRates: { rate: rates.rate || '0' },
    },
    description: {
      moniker: description.moniker || '',
      identity: description.identity || '',
      website: description.website || '',
      securityContact:
        description.security_contact || description.securityContact || '',
      details: description.details || '',
    },
  }
}

export async function fetchLiveValidators(): Promise<LiveValidatorsResponse> {
  const response = await fetch('/api/validators/live')
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.details || body.error || 'Failed to fetch validators')
  }
  return response.json()
}

export function mapValidatorToTableRow(
  validator: LiveValidator,
  delegatorCount: number | null = null
) {
  return {
    operatorAddress: validator.operatorAddress,
    validator: validator.description.moniker || validator.operatorAddress,
    identity: validator.description.identity,
    website: validator.description.website,
    details: validator.description.details,
    securityContact: validator.description.securityContact,
    votingPower: parseInt(validator.tokens || '0', 10),
    votingPowerPercentage: '0%',
    commission: convertRateToPercent(validator.commission.commissionRates.rate),
    delegatorCount,
    status: validator.bondStatusNum,
    jailed: validator.jailed,
  }
}
