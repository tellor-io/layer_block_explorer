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

    // Make the request to the RPC endpoint with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(
      `${baseEndpoint}/cosmos/staking/v1beta1/validators/${validatorAddress}/delegations`,
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(
        `RPC request failed with status ${response.status} for ${validatorAddress} from ${baseEndpoint}`
      )
      // Report failure to RPC manager
      await rpcManager.reportFailure(currentEndpoint)

      // Return proper error status like other APIs
      return res.status(response.status).json({
        error: `Failed to fetch delegations for validator ${validatorAddress}`,
        details: `RPC endpoint returned status ${response.status}`,
      })
    }

    const data = await response.json()

    // Report success to RPC manager
    await rpcManager.reportSuccess(currentEndpoint)

    return res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching validator delegations:', error)

    // Report failure to RPC manager
    try {
      const currentEndpoint = await rpcManager.getCurrentEndpoint()
      await rpcManager.reportFailure(currentEndpoint)
    } catch (rpcError) {
      console.error('Error reporting RPC failure:', rpcError)
    }

    // Return proper error status like other APIs
    return res.status(500).json({
      error: 'Failed to fetch validator delegations',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
