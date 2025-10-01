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

    // Retry logic with exponential backoff
    const maxRetries = 3
    const baseDelay = 1000 // 1 second
    let lastError: any = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[PROD DEBUG] Attempt ${attempt + 1}/${maxRetries + 1} for ${validatorAddress}`)
        
        const response = await fetch(
          `${baseEndpoint}/cosmos/staking/v1beta1/validators/${validatorAddress}/delegations`
        )

        console.log(`[PROD DEBUG] Response status: ${response.status}`)
        console.log(`[PROD DEBUG] Response ok: ${response.ok}`)

        if (response.ok) {
          const data = await response.json()
          console.log(`[PROD DEBUG] Success on attempt ${attempt + 1}: ${data.delegation_responses?.length || 0} delegations`)
          await rpcManager.reportSuccess(endpoint)
          return res.status(200).json(data)
        }

        // If not the last attempt, wait and retry
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff: 1s, 2s, 4s
          console.log(`[PROD DEBUG] Request failed with status ${response.status}, retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // Last attempt failed
        const errorText = await response.text()
        lastError = { status: response.status, text: errorText }
        console.warn(
          `RPC request failed after ${maxRetries + 1} attempts with status ${response.status} for ${validatorAddress} from ${baseEndpoint}`
        )
        console.warn(`Error response: ${errorText}`)
        
      } catch (error) {
        lastError = error
        console.warn(`[PROD DEBUG] Request error on attempt ${attempt + 1}:`, error)
        
        // If not the last attempt, wait and retry
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt)
          console.log(`[PROD DEBUG] Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
    }

    // All retries failed
    await rpcManager.reportFailure(endpoint)
    console.log(`[PROD DEBUG] All ${maxRetries + 1} attempts failed for ${validatorAddress}`)

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
