import { consensusPubkeyToBech32Address, convertRateToPercent } from '@/utils/helper'
import type { LiveValidator, LiveValidatorsResponse, ValidatorDetail } from './types'

export function monikerByConsensusAddress(
  validators: Array<Pick<LiveValidator, 'consensusPubkey' | 'description' | 'operatorAddress'>>
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const validator of validators) {
    const consensusAddress = consensusPubkeyToBech32Address(validator.consensusPubkey)
    if (!consensusAddress) continue
    map[consensusAddress] = validator.description.moniker || validator.operatorAddress
  }
  return map
}

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

const pubkeyKey = (consensusPubkey: unknown): string | null => {
  if (!consensusPubkey || typeof consensusPubkey !== 'object' || !('key' in consensusPubkey)) {
    return null
  }
  const key = (consensusPubkey as { key?: unknown }).key
  return typeof key === 'string' ? key : null
}

export function normalizeValidatorDetail(raw: Record<string, unknown>): ValidatorDetail {
  const description = (raw.description as Record<string, string>) || {}
  const commission = (raw.commission as Record<string, unknown>) || {}
  const rates =
    (commission.commission_rates as Record<string, string>) ||
    (commission.commissionRates as Record<string, string>) ||
    {}
  const pubkey = raw.consensus_pubkey || raw.consensusPubkey

  return {
    operatorAddress: String(raw.operator_address || raw.operatorAddress || ''),
    consensusAddress: consensusPubkeyToBech32Address(pubkey),
    consensusPubkey: pubkeyKey(pubkey),
    moniker: description.moniker || '',
    identity: description.identity || '',
    website: description.website || '',
    details: description.details || '',
    securityContact: description.security_contact || description.securityContact || '',
    status: String(raw.status || raw.bond_status || raw.bondStatus || ''),
    jailed: Boolean(raw.jailed),
    tokens: String(raw.tokens || '0'),
    delegatorShares: String(raw.delegator_shares || raw.delegatorShares || '0'),
    minSelfDelegation: String(raw.min_self_delegation || raw.minSelfDelegation || '0'),
    unbondingHeight: String(raw.unbonding_height || raw.unbondingHeight || '0'),
    unbondingTime: String(raw.unbonding_time || raw.unbondingTime || ''),
    commissionRate: rates.rate || '0',
    commissionMaxRate: rates.max_rate || rates.maxRate || '0',
    commissionMaxChangeRate: rates.max_change_rate || rates.maxChangeRate || '0',
    commissionUpdateTime: String(commission.update_time || commission.updateTime || ''),
    accruedCommission: null,
    outstandingRewards: null,
    signingInfo: null,
  }
}

export async function fetchValidatorDetail(operatorAddress: string): Promise<ValidatorDetail> {
  const response = await fetch(`/api/validators/${encodeURIComponent(operatorAddress)}`)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.details || body.error || 'Failed to fetch validator')
  }
  return body.validator as ValidatorDetail
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
