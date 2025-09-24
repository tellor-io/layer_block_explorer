import { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '@/utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { validatorAddress } = req.query

  if (!validatorAddress || typeof validatorAddress !== 'string') {
    return res.status(400).json({ error: 'Validator address is required' })
  }

  try {
    // Get the current endpoint from the RPC manager
    const currentEndpoint = await rpcManager.getCurrentEndpoint()
    // Remove /rpc from the endpoint for API calls
    const baseEndpoint = currentEndpoint.replace('/rpc', '')
    
    // Make the request to the RPC endpoint
    const response = await fetch(
      `${baseEndpoint}/cosmos/staking/v1beta1/validators/${validatorAddress}/delegations`
    )

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch delegations',
        status: response.status 
      })
    }

    const data = await response.json()
    
    // Report success to RPC manager
    await rpcManager.reportSuccess(currentEndpoint)
    
    return res.status(200).json(data)
  } catch (error) {
    // Report failure to RPC manager
    try {
      const currentEndpoint = await rpcManager.getCurrentEndpoint()
      await rpcManager.reportFailure(currentEndpoint)
    } catch (rpcError) {
      // Silently handle RPC failure reporting errors
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
