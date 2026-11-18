import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchAccountTransactions } from '@/lib/indexer/records'
import {
  firstValue,
  networkFromRequest,
  pageSize,
  sendFailure,
} from '@/lib/indexer/request'

// GET /api/indexer/account/[address]/transactions?first=30&after=<cursor>: one page of the address's transactions, newest first
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const address = firstValue(req.query.address)
  if (!address) {
    return res.status(400).json({ error: 'Account address is required' })
  }

  try {
    const transactions = await fetchAccountTransactions(
      address,
      pageSize(req.query.first, 30, 100),
      firstValue(req.query.after) || undefined,
      networkFromRequest(req)
    )
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ transactions })
  } catch (error) {
    sendFailure(res, 'Failed to fetch account transactions', error)
  }
}
