import type { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '../../utils/rpcManager'
import { LS_ACTIVE_NETWORK } from '@/utils/constant'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const endpoint =
      (req.query.endpoint as string) ||
      (await rpcManager.getCurrentEndpoint(req.cookies[LS_ACTIVE_NETWORK]))
    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await fetch(
      `${baseEndpoint}/layer/bridge/get_evm_validators`
    )

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch EVM validators',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
