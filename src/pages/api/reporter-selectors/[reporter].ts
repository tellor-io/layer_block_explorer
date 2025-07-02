import type { NextApiRequest, NextApiResponse } from 'next'
import { RPCManager } from '@/utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { reporter } = req.query

  if (!reporter || typeof reporter !== 'string') {
    return res.status(400).json({ error: 'Invalid reporter address' })
  }

  try {
    const { rpc } = req.query
    
    // Use RPC address from query if provided, otherwise use rpcManager
    let endpoint: string
    if (rpc) {
      endpoint = rpc as string
    } else {
      const rpcManager = RPCManager.getInstance()
      endpoint = await rpcManager.getCurrentEndpoint()
    }
    
    const baseEndpoint = endpoint.replace('/rpc', '')
    

    const response = await fetch(
      `${baseEndpoint}/tellor-io/layer/reporter/num-of-selectors-by-reporter/${reporter}`
    )

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch reporter selectors',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
