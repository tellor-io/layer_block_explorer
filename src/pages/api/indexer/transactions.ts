import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchLatestTransactions } from '@/lib/indexer/records'
import {
  networkFromRequest,
  pageSize,
  sendFailure,
} from '@/lib/indexer/request'

// GET /api/indexer/transactions?first=50: the newest transactions with their JSON text decoded
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const transactions = await fetchLatestTransactions(
      pageSize(req.query.first, 50, 100),
      networkFromRequest(req)
    )
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ transactions })
  } catch (error) {
    sendFailure(res, 'Failed to fetch transactions', error)
  }
}
