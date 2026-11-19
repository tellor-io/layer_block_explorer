import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchBlock } from '@/lib/indexer/records'
import {
  firstValue,
  networkFromRequest,
  sendFailure,
} from '@/lib/indexer/request'

// GET /api/indexer/block/[height]: the block with its vote extension text decoded, or null when the indexer has none
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const height = firstValue(req.query.height)
  if (!height) {
    return res.status(400).json({ error: 'Block height is required' })
  }

  try {
    const block = await fetchBlock(height, networkFromRequest(req))
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ block })
  } catch (error) {
    sendFailure(res, 'Failed to fetch block', error)
  }
}
