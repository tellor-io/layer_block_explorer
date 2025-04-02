import type { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '../../utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const endpoint = req.query.endpoint as string || await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')
    
    const response = await fetch(
      `${baseEndpoint}/cosmos/base/tendermint/v1beta1/blocks/latest`
    )

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch latest block',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
} 