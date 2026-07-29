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
