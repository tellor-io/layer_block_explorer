export interface LiveValidatorDescription {
  moniker: string
  identity: string
  website: string
  securityContact: string
  details: string
}

export interface LiveValidator {
  operatorAddress: string
  consensusPubkey?: unknown
  bondStatus: string
  bondStatusNum: number
  tokens: string
  jailed: boolean
  commission: {
    commissionRates: { rate: string }
  }
  description: LiveValidatorDescription
}

export interface LiveValidatorsResponse {
  validators: LiveValidator[]
  count: number
}

export interface ValidatorCoin {
  denom: string
  amount: string
}

export interface ValidatorSigningInfo {
  startHeight: string
  jailedUntil: string
  tombstoned: boolean
  missedBlocksCounter: string
}

export interface ValidatorDetail {
  operatorAddress: string
  consensusAddress: string | null
  consensusPubkey: string | null
  moniker: string
  identity: string
  website: string
  details: string
  securityContact: string
  status: string
  jailed: boolean
  tokens: string
  delegatorShares: string
  minSelfDelegation: string
  unbondingHeight: string
  unbondingTime: string
  commissionRate: string
  commissionMaxRate: string
  commissionMaxChangeRate: string
  commissionUpdateTime: string
  accruedCommission: ValidatorCoin[] | null
  outstandingRewards: ValidatorCoin[] | null
  signingInfo: ValidatorSigningInfo | null
}

export interface LiveReporterMetadata {
  moniker: string
  jailed: boolean
  min_tokens_required: string
  commission_rate: string
  last_updated: string
  jailed_until: string
}

export interface LiveReporter {
  address: string
  power: string
  metadata: LiveReporterMetadata
}

export interface LiveReportersResponse {
  reporters: LiveReporter[]
  count: number
}

export interface LiveDelegation {
  delegatorAddress: string
  validatorAddress: string
  shares: string
  balance?: { denom: string; amount: string }
}

export interface LiveDelegationsResponse {
  delegations: LiveDelegation[]
  count: number
}
