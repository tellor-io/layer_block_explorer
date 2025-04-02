import type { NextApiRequest, NextApiResponse } from 'next'
import { RPCManager } from '../../../utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { snapshot } = req.query

  if (!snapshot || typeof snapshot !== 'string') {
    return res.status(400).json({ error: 'Snapshot is required' })
  }

  try {
    const rpcManager = RPCManager.getInstance()
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await fetch(
      `${baseEndpoint}/layer/bridge/get_attestation_data_by_snapshot/${snapshot}`
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('External API error response:', errorText)
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      )
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching attestation data:', error)
    res.status(500).json({
      error: 'Failed to fetch attestation data',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
