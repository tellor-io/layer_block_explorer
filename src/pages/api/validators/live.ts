import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchWithRpcFailover } from '@/utils/rpcFailover'
import { normalizeValidator } from '@/datasources/live/validators'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data } = await fetchWithRpcFailover(
      req,
      (base) =>
        `${base}/cosmos/staking/v1beta1/validators?pagination.limit=500`
    )

    const raw = data as { validators?: Record<string, unknown>[] }
    const validators = (raw.validators || []).map(normalizeValidator)

    res.status(200).json({ validators, count: validators.length })
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch validators',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
