import type { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '../../utils/rpcManager'
import { LS_ACTIVE_NETWORK } from '@/utils/constant'
import { decodeSpotPriceQueryData } from '../../utils/tellorQueryDecoder'

// Define interface for cache structure
interface CacheData {
  data: Array<{ queryParams: string }>
  lastUpdated: Date
}

// In-memory cache to store unique pairs
let cache: CacheData = {
  data: [],
  lastUpdated: new Date(),
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const endpoint = await rpcManager.getCurrentEndpoint(
      req.cookies[LS_ACTIVE_NETWORK]
    )
    const baseEndpoint = endpoint.replace('/rpc', '')

    const targetUrl = `${baseEndpoint}/tellor-io/layer/oracle/get_cycle_list`
    const response = await fetch(targetUrl)

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    // The RPC endpoint returns cycle_list as an array of hex-encoded query data strings
    // Each string represents one pair in the current cycle list
    if (!data.cycle_list || !Array.isArray(data.cycle_list)) {
      throw new Error('Unexpected response format: cycle_list is missing or not an array')
    }
    
    const queryDataArray = data.cycle_list

    // Decode each query data string to get the pair
    const decodedPairs: string[] = []
    for (const hexData of queryDataArray) {
      const pair = decodeSpotPriceQueryData(hexData)
      if (pair) {
        decodedPairs.push(pair)
      }
    }

    // Replace cache with the full decoded list from RPC endpoint
    // This ensures we always have the complete current cycle list
    cache.data = decodedPairs.map((pair) => ({ queryParams: pair }))
    cache.lastUpdated = new Date()

    res.status(200).json({
      cycleList: cache.data,
      lastUpdated: cache.lastUpdated,
    })
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch current cycle',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
