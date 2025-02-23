import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { RPC_ENDPOINTS } from '@/utils/constant'

// Add a simple in-memory cache
const cache = new Map<
  string,
  {
    data: any
    timestamp: number
  }
>()

const CACHE_DURATION = 5000 // 5 seconds cache

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { queryId, timestamp } = req.query

  if (
    !queryId ||
    !timestamp ||
    typeof queryId !== 'string' ||
    typeof timestamp !== 'string'
  ) {
    return res
      .status(400)
      .json({ error: 'Query ID and timestamp are required' })
  }

  const cacheKey = `${queryId}-${timestamp}`
  const cachedData = cache.get(cacheKey)

  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return res.status(200).json(cachedData.data)
  }

  let timestampNum = parseInt(timestamp, 10)
  const currentTime = Date.now()
  if (timestampNum > currentTime) {
    timestampNum = currentTime
  }

  let lastError = null

  // Try each endpoint sequentially with proper error handling
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const url = `${endpoint}/tellor-io/layer/oracle/get_reports_by_aggregate/${queryId}/${timestampNum}?pagination.limit=600`

      const response = await axios.get(url, {
        timeout: 3000, // Reduced timeout
        headers: {
          Accept: 'application/json',
        },
      })

      const data = response.data

      if (!data || !data.microReports) {
        continue // Skip to next endpoint if data is invalid
      }

      const uniqueReporters = new Set(
        data.microReports.map((report: any) => report.reporter)
      )

      const totalPower = data.microReports.reduce(
        (sum: number, report: any) => {
          const power = parseInt(report.power || '0', 10)
          return sum + power
        },
        0
      )

      const firstReport = data.microReports[0] || {}

      const responseData = {
        count:
          uniqueReporters.size || parseInt(data.pagination?.total || '0', 10),
        queryType: firstReport.query_type || 'N/A',
        aggregateMethod: firstReport.aggregate_method || 'N/A',
        cycleList: firstReport.cyclelist || false,
        totalPower,
        endpoint,
      }

      // Cache the successful response
      cache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      })

      return res.status(200).json(responseData)
    } catch (error) {
      lastError = error
      continue // Try next endpoint
    }
  }

  // If we have cached data but it's expired, return it as a fallback
  if (cachedData) {
    return res.status(200).json(cachedData.data)
  }

  // All endpoints failed and no cache
  return res.status(500).json({
    error: 'Failed to fetch reporter count',
    details: lastError instanceof Error ? lastError.message : 'Unknown error',
  })
}

export async function getReporterCount(queryId: string, timestamp: string) {
  const maxRetries = 3
  const retryDelay = 1000 // 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        `/api/reporter-count?queryId=${queryId}&timestamp=${timestamp}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Validate the response data
      if (!data || typeof data.count === 'undefined') {
        throw new Error('Invalid response data')
      }

      return {
        count: data.count || 0,
        queryType: data.queryType || 'N/A',
        aggregateMethod: data.aggregateMethod || 'N/A',
        cycleList: data.cycleList || false,
        totalPower: data.totalPower || 0,
      }
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error('Error in getReporterCount:', error)
        return {
          count: 0,
          queryType: 'N/A',
          aggregateMethod: 'N/A',
          cycleList: false,
          totalPower: 0,
        }
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }

  // Fallback return if all retries fail
  return {
    count: 0,
    queryType: 'N/A',
    aggregateMethod: 'N/A',
    cycleList: false,
    totalPower: 0,
  }
}
