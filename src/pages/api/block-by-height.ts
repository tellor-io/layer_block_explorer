import type { NextApiRequest, NextApiResponse } from 'next'
import { RPCManager } from '../../utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { height } = req.query

  if (!height || typeof height !== 'string') {
    return res.status(400).json({ error: 'Height is required' })
  }

  try {
    const rpcManager = RPCManager.getInstance()
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await fetch(
      `${baseEndpoint}/cosmos/base/tendermint/v1beta1/blocks/${height}`
    )

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch block',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
