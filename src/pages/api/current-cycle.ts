import type { NextApiRequest, NextApiResponse } from 'next'

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
  _req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const targetUrl =
      'https://tellorlayer.com/tellor-io/layer/oracle/current_cyclelist_query'
    const response = await fetch(targetUrl)

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()
    const asciiData = Buffer.from(data.query_data, 'hex').toString('ascii')
    const matches = asciiData.match(/[a-z]{3}/g)

    if (matches && matches.length >= 2) {
      const currentPair = {
        queryParams: `${matches[matches.length - 2]}/${
          matches[matches.length - 1]
        }`,
      }

      if (
        !cache.data.some((pair) => pair.queryParams === currentPair.queryParams)
      ) {
        cache.data.push(currentPair)
      }
    }

    cache.lastUpdated = new Date()

    res.status(200).json({
      cycleList: cache.data,
      lastUpdated: cache.lastUpdated,
    })
  } catch (error) {
    if (cache.data.length > 0) {
      return res.status(200).json({
        cycleList: cache.data,
        lastUpdated: cache.lastUpdated,
        fromCache: true,
      })
    }
    res.status(500).json({ error: 'Failed to fetch current cycle list' })
  }
}
