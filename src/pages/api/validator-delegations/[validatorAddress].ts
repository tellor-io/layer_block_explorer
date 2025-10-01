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
    // Get the current endpoint from the RPC manager, with fallback options like validators API
    const endpoint =
      (req.query.endpoint as string) ||
      (req.query.rpc as string) ||
      (await rpcManager.getCurrentEndpoint())
    // Remove /rpc from the endpoint for API calls
    const baseEndpoint = endpoint.replace('/rpc', '')

    console.log(`[PROD DEBUG] Validator: ${validatorAddress}`)
    console.log(`[PROD DEBUG] Query params:`, req.query)
    console.log(`[PROD DEBUG] Using endpoint: ${endpoint}`)
    console.log(`[PROD DEBUG] Base endpoint: ${baseEndpoint}`)

    const response = await fetch(
      `${baseEndpoint}/cosmos/staking/v1beta1/validators/${validatorAddress}/delegations`
    )

    console.log(`[PROD DEBUG] Response status: ${response.status}`)
    console.log(`[PROD DEBUG] Response ok: ${response.ok}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(
        `RPC request failed with status ${response.status} for ${validatorAddress} from ${baseEndpoint}`
      )
      console.warn(`Error response: ${errorText}`)
      // Report failure to RPC manager
      await rpcManager.reportFailure(endpoint)

      // Return empty delegations instead of error for better UX
      return res.status(200).json({
        delegation_responses: [],
        error: `RPC request failed: ${response.status} - ${errorText}`,
      })
    }

    const data = await response.json()

    console.log(`[PROD DEBUG] Delegation count: ${data.delegation_responses?.length || 0}`)

    // Report success to RPC manager
    await rpcManager.reportSuccess(endpoint)

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

    // Return empty delegations instead of error for better UX
    return res.status(200).json({
      delegation_responses: [],
      error: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}
