import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchTransaction } from '@/lib/indexer/records'
import {
  firstValue,
  networkFromRequest,
  sendFailure,
} from '@/lib/indexer/request'

// GET /api/indexer/transaction/[hash]: the transaction with its JSON text decoded, or null when the indexer has none
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const hash = firstValue(req.query.hash)
  if (!hash) {
    return res.status(400).json({ error: 'Transaction hash is required' })
  }

  try {
    const transaction = await fetchTransaction(hash, networkFromRequest(req))
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ transaction })
  } catch (error) {
    sendFailure(res, 'Failed to fetch transaction', error)
  }
}
