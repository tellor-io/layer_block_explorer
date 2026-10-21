import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchWithRpcFailover } from '@/utils/rpcFailover'
import { normalizeValidatorDetail } from '@/datasources/live/validators'
import type { ValidatorCoin, ValidatorSigningInfo } from '@/datasources/live/types'

function coinsFrom(raw: unknown): ValidatorCoin[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((coin) => {
    if (!coin || typeof coin !== 'object') return []
    const denom = String((coin as { denom?: unknown }).denom || '')
    if (!denom) return []
    return [{ denom, amount: String((coin as { amount?: unknown }).amount || '0') }]
  })
}

async function fetchOptional(
  req: NextApiRequest,
  buildUrl: (base: string) => string
): Promise<unknown | null> {
  try {
    const { data } = await fetchWithRpcFailover(req, buildUrl)
    return data
  } catch {
    return null
  }
}

function signingInfoFrom(data: unknown): ValidatorSigningInfo | null {
  if (!data || typeof data !== 'object' || !('val_signing_info' in data)) return null
  const info = (data as { val_signing_info?: Record<string, unknown> }).val_signing_info
  if (!info) return null
  return {
    startHeight: String(info.start_height || '0'),
    jailedUntil: String(info.jailed_until || ''),
    tombstoned: Boolean(info.tombstoned),
    missedBlocksCounter: String(info.missed_blocks_counter || '0'),
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { operatorAddress } = req.query
  if (!operatorAddress || typeof operatorAddress !== 'string') {
    return res.status(400).json({ error: 'Validator address is required' })
  }

  try {
    const { data } = await fetchWithRpcFailover(
      req,
      (base) => `${base}/cosmos/staking/v1beta1/validators/${operatorAddress}`
    )
    const raw = data as { validator?: Record<string, unknown> }
    if (!raw.validator) {
      return res.status(404).json({
        error: 'Validator not found',
        details: 'No validator is registered for this operator address',
      })
    }

    const validator = normalizeValidatorDetail(raw.validator)
    const [commissionData, rewardsData, signingData] = await Promise.all([
      fetchOptional(
        req,
        (base) =>
          `${base}/cosmos/distribution/v1beta1/validators/${operatorAddress}/commission`
      ),
      fetchOptional(
        req,
        (base) =>
          `${base}/cosmos/distribution/v1beta1/validators/${operatorAddress}/outstanding_rewards`
      ),
      validator.consensusAddress
        ? fetchOptional(
            req,
            (base) =>
              `${base}/cosmos/slashing/v1beta1/signing_infos/${validator.consensusAddress}`
          )
        : Promise.resolve(null),
    ])

    const commission = commissionData as { commission?: { commission?: unknown } } | null
    const rewards = rewardsData as { rewards?: { rewards?: unknown } } | null
    validator.accruedCommission = commissionData
      ? coinsFrom(commission?.commission?.commission)
      : null
    validator.outstandingRewards = rewardsData
      ? coinsFrom(rewards?.rewards?.rewards)
      : null
    validator.signingInfo = signingInfoFrom(signingData)

    res.status(200).json({ validator })
  } catch (error) {
    const notFound = axios.isAxiosError(error) && error.response?.status === 404
    console.error('API Route Error:', error)
    res.status(notFound ? 404 : 500).json({
      error: notFound ? 'Validator not found' : 'Failed to fetch validator',
      details: notFound
        ? 'No validator is registered for this operator address'
        : error instanceof Error
          ? error.message
          : 'Unknown error',
    })
  }
}
