import type { NextApiRequest, NextApiResponse } from 'next'
import { getValidators } from '../../rpc/query'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { clearCache, sortBy, sortOrder, page, perPage } = req.query

  // Allow cache clearing via query parameter
  if (clearCache === 'true') {
    clearValidatorsCache()
    return res.status(200).json({ message: 'Cache cleared' })
  }

  try {
    // Try GraphQL first
    const graphqlData = await getValidators()
    return res.status(200).json(graphqlData)
  } catch (graphqlError) {
    console.warn('GraphQL failed, falling back to RPC:', graphqlError)
    try {
      // Fallback to RPC
      const endpoint =
        (req.query.endpoint as string) || (await rpcManager.getCurrentEndpoint())
      // Remove '/rpc' from the endpoint if it exists
      const baseEndpoint = endpoint.replace('/rpc', '')

      // Check cache first
      const cacheKey = baseEndpoint
      const cachedData = cache.get(cacheKey)
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        return res.status(200).json(cachedData.data)
      }

      const response = await fetch(
        `${baseEndpoint}/cosmos/staking/v1beta1/validators`
      )

      if (!response.ok) {
        throw new Error(`External API responded with status: ${response.status}`)
      }

      const data = await response.json()
      
      // Cache the data
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      })
      
      return res.status(200).json(data)
    } catch (rpcError) {
      console.error('Both GraphQL and RPC failed:', { graphqlError, rpcError })
      return res.status(500).json({ 
        error: 'Both data sources failed',
        details: {
          graphql: graphqlError instanceof Error ? graphqlError.message : 'Unknown GraphQL error',
          rpc: rpcError instanceof Error ? rpcError.message : 'Unknown RPC error'
        }
      })
    }
  }
}
