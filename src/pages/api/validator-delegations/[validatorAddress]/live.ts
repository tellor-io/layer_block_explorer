import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchWithRpcFailover } from '@/utils/rpcFailover'
import { normalizeDelegation } from '@/datasources/live/delegations'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { validatorAddress, countOnly } = req.query

  if (!validatorAddress || typeof validatorAddress !== 'string') {
    return res.status(400).json({ error: 'Validator address is required' })
  }

  const limit = countOnly === 'true' ? 1 : 500

  try {
    const { data } = await fetchWithRpcFailover(
      req,
      (base) =>
        `${base}/cosmos/staking/v1beta1/validators/${validatorAddress}/delegations?pagination.limit=${limit}`
    )

    const raw = data as {
      delegation_responses?: Record<string, unknown>[]
      delegations?: Record<string, unknown>[]
      pagination?: { total?: string }
    }

    const delegationResponses =
      raw.delegation_responses || raw.delegations || []

    const delegations = countOnly === 'true'
      ? []
      : delegationResponses.map((item) => {
          const delegation =
            (item.delegation as Record<string, unknown>) || item
          const normalized = normalizeDelegation(delegation)
          const balance = item.balance as { denom?: string; amount?: string } | undefined
          if (balance) {
            normalized.balance = {
              denom: balance.denom || 'loya',
              amount: balance.amount || '0',
            }
          }
          return normalized
        })

    const count =
      raw.pagination?.total != null
        ? parseInt(String(raw.pagination.total), 10)
        : delegationResponses.length

    res.status(200).json({ delegations, count })
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch validator delegations',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
