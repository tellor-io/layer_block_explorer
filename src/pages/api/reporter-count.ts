import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { RPC_ENDPOINTS } from '@/utils/constant'
import { rpcManager } from '@/utils/rpcManager'

// Add a simple in-memory cache
const cache = new Map<
  string,
  {
    data: any
    timestamp: number
  }
>()

const CACHE_DURATION = 5000 // Reduce from 10 seconds to 5 seconds cache
const INITIAL_DELAY = 1000 // 1 second wait before first attempt
const AXIOS_TIMEOUT = 5000 // Increase from 3000 to 5000ms

// Function to clear cache
export const clearReporterCountCache = () => {
  cache.clear()
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { queryId, timestamp, clearCache, endpoint: customEndpoint } = req.query

  // Allow cache clearing via query parameter
  if (clearCache === 'true') {
    clearReporterCountCache()
    return res.status(200).json({ message: 'Cache cleared' })
  }

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
  let successfulResponse = null

  await new Promise((resolve) => setTimeout(resolve, INITIAL_DELAY))

  // Use custom endpoint if provided, otherwise fall back to RPC_ENDPOINTS
  const endpointsToTry =
    customEndpoint && typeof customEndpoint === 'string'
      ? [customEndpoint, ...RPC_ENDPOINTS.filter((ep) => ep !== customEndpoint)]
      : RPC_ENDPOINTS

  for (const endpoint of endpointsToTry) {
    try {
      const baseEndpoint = endpoint.endsWith('/rpc')
        ? endpoint.slice(0, -4) // Remove '/rpc'
        : endpoint

      const url = `${baseEndpoint}/tellor-io/layer/oracle/get_reports_by_aggregate/${queryId}/${timestampNum}?pagination.limit=600`

      const response = await axios.get(url, {
        timeout: AXIOS_TIMEOUT,
        headers: { Accept: 'application/json' },
      })

      const data = response.data
      if (!data || !data.microReports || !Array.isArray(data.microReports)) {
        continue
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
      successfulResponse = {
        count:
          uniqueReporters.size || parseInt(data.pagination?.total || '0', 10),
        queryType: firstReport.query_type || 'N/A',
        aggregateMethod: firstReport.aggregate_method || 'N/A',
        cycleList: firstReport.cyclelist || false,
        totalPower,
        endpoint: baseEndpoint,
      }
      break
    } catch (error) {
      lastError = error
      continue
    }
  }

  if (successfulResponse) {
    cache.set(cacheKey, {
      data: successfulResponse,
      timestamp: Date.now(),
    })
    return res.status(200).json(successfulResponse)
  }

  if (cachedData) {
    return res.status(200).json(cachedData.data)
  }

  console.error('[reporter-count] All endpoints failed. Last error:', lastError)
  return res.status(500).json({
    error: 'Failed to fetch reporter count',
    details: lastError instanceof Error ? lastError.message : 'Unknown error',
  })
}
