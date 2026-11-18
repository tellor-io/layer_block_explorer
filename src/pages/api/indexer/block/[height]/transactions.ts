import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchBlockTransactions } from '@/lib/indexer/records'
import {
  firstValue,
  networkFromRequest,
  pageSize,
  sendFailure,
} from '@/lib/indexer/request'

// GET /api/indexer/block/[height]/transactions?first=100: the block's transactions with their JSON text decoded
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
    const transactions = await fetchBlockTransactions(
      height,
      pageSize(req.query.first, 100, 100),
      networkFromRequest(req)
    )
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ transactions })
  } catch (error) {
    sendFailure(res, 'Failed to fetch block transactions', error)
  }
}
