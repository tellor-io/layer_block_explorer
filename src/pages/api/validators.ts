import type { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '../../utils/rpcManager'

// Add a simple in-memory cache for validators
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5000 // 5 seconds cache

// Function to clear cache
export const clearValidatorsCache = () => {
  cache.clear()
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { clearCache } = req.query

  // Allow cache clearing via query parameter
  if (clearCache === 'true') {
    clearValidatorsCache()
    return res.status(200).json({ message: 'Cache cleared' })
  }

  try {
    const endpoint =
      (req.query.endpoint as string) ||
      (req.query.rpc as string) ||
      (await rpcManager.getCurrentEndpoint())
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

    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch validators',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
