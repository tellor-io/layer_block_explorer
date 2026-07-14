import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchWithRpcFailover } from '@/utils/rpcFailover'
import { normalizeReporter } from '@/datasources/live/reporters'

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
        `${base}/tellor-io/layer/reporter/reporters?pagination.limit=500`
    )

    const raw = data as { reporters?: Record<string, unknown>[] }
    const reporters = (raw.reporters || []).map(normalizeReporter)

    res.status(200).json({ reporters, count: reporters.length })
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch reporters',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
