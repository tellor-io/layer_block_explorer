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


    // Retry logic with exponential backoff
    const maxRetries = 3
    const baseDelay = 1000 // 1 second
    let lastError: any = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(
          `${baseEndpoint}/cosmos/staking/v1beta1/validators/${validatorAddress}/delegations`
        )

        if (response.ok) {
          const data = await response.json()
          await rpcManager.reportSuccess(endpoint)
          return res.status(200).json(data)
        }

        // If not the last attempt, wait and retry
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // Last attempt failed
        const errorText = await response.text()
        lastError = { status: response.status, text: errorText }
        
      } catch (error) {
        lastError = error
        
        // If not the last attempt, wait and retry
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
    }

    // All retries failed
    await rpcManager.reportFailure(endpoint)

    // Return empty delegations if all retries fail
    return res.status(200).json({
      delegation_responses: [],
      error: `RPC request failed after ${maxRetries + 1} attempts: ${lastError?.status || 'Network error'} - ${lastError?.text || lastError?.message || 'Unknown error'}`,
    })
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
