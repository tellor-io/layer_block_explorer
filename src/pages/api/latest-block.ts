import type { NextApiRequest, NextApiResponse } from 'next'
import { getLatestBlock } from '../../rpc/query'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Use RPC as data source for server-side API
    const rpcEndpoint = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://node-palmito.tellorlayer.com/rpc'
    const rpcData = await getLatestBlock(rpcEndpoint)
    return res.status(200).json(rpcData)
  } catch (error) {
    console.error('RPC failed:', error)
    return res.status(500).json({
      error: 'Failed to fetch latest block',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
