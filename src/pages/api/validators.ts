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
  const { clearCache, sortBy, sortOrder, page, perPage } = req.query

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

    // Check cache first (only if no sorting/pagination)
    const cacheKey = baseEndpoint
    const cachedData = cache.get(cacheKey)
    if (
      cachedData &&
      Date.now() - cachedData.timestamp < CACHE_DURATION &&
      !sortBy
    ) {
      return res.status(200).json(cachedData.data)
    }

    const response = await fetch(
      `${baseEndpoint}/cosmos/staking/v1beta1/validators`
    )

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Apply sorting if requested
    if (sortBy && data.validators) {
      const sortField = sortBy as string
      const order = sortOrder === 'desc' ? -1 : 1

      data.validators.sort((a: any, b: any) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        // Handle nested properties
        if (sortField === 'validator') {
          aValue = a.description?.moniker || a.operator_address
          bValue = b.description?.moniker || b.operator_address
        } else if (sortField === 'votingPower') {
          aValue = parseInt(a.tokens || '0')
          bValue = parseInt(b.tokens || '0')
        } else if (sortField === 'commission') {
          aValue = parseFloat(a.commission?.commission_rates?.rate || '0')
          bValue = parseFloat(b.commission?.commission_rates?.rate || '0')
        } else if (sortField === 'delegatorCount') {
          // Note: delegatorCount is calculated client-side, so we can't sort by it server-side
          // This will be handled by client-side sorting
          return 0
        }

        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue) * order
        }

        // Handle numeric comparison
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * order
        }

        return 0
      })
    }

    // Apply pagination if requested
    if (page && perPage && data.validators) {
      const pageNum = parseInt(page as string)
      const perPageNum = parseInt(perPage as string)
      const start = pageNum * perPageNum
      const end = start + perPageNum

      data.validators = data.validators.slice(start, end)
    }

    // Cache the data (only if no sorting/pagination)
    if (!sortBy) {
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      })
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch validators',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
