import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

// Add a simple in-memory cache
const cache = new Map<
  string,
  {
    data: any
    timestamp: number
  }
>()

const CACHE_DURATION = 5000 // 5 seconds cache
const RPC_ENDPOINTS = ['https://rpc.layer-node.com', 'https://tellorlayer.com']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { queryId, timestamp } = req.query
  console.log(
    `[reporter-count] Request received for queryId: ${queryId}, timestamp: ${timestamp}`
  )

  if (
    !queryId ||
    !timestamp ||
    typeof queryId !== 'string' ||
    typeof timestamp !== 'string'
  ) {
    console.log('[reporter-count] Invalid request parameters')
    return res
      .status(400)
      .json({ error: 'Query ID and timestamp are required' })
  }

  const cacheKey = `${queryId}-${timestamp}`
  const cachedData = cache.get(cacheKey)

  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    console.log('[reporter-count] Returning cached data:', cachedData.data)
    return res.status(200).json(cachedData.data)
  }

  let timestampNum = parseInt(timestamp, 10)
  const currentTime = Date.now()
  if (timestampNum > currentTime) {
    console.log(
      `[reporter-count] Adjusting future timestamp from ${timestampNum} to ${currentTime}`
    )
    timestampNum = currentTime
  }

  let lastError = null
  let successfulResponse = null

  for (const endpoint of RPC_ENDPOINTS) {
    try {
      console.log(`[reporter-count] Trying endpoint: ${endpoint}`)
      const url = `${endpoint}/tellor-io/layer/oracle/get_reports_by_aggregate/${queryId}/${timestampNum}?pagination.limit=600`

      const response = await axios.get(url, {
        timeout: 3000,
        headers: {
          Accept: 'application/json',
        },
      })

      const data = response.data
      console.log(`[reporter-count] Raw response from ${endpoint}:`, data)

      if (!data || !data.microReports || !Array.isArray(data.microReports)) {
        console.log(`[reporter-count] Invalid data structure from ${endpoint}`)
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
        endpoint,
      }

      console.log(
        `[reporter-count] Successful response from ${endpoint}:`,
        successfulResponse
      )
      break
    } catch (error) {
      console.error(`[reporter-count] Error with endpoint ${endpoint}:`, error)
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
    console.log(
      '[reporter-count] Using expired cache as fallback:',
      cachedData.data
    )
    return res.status(200).json(cachedData.data)
  }

  console.error('[reporter-count] All endpoints failed. Last error:', lastError)
  return res.status(500).json({
    error: 'Failed to fetch reporter count',
    details: lastError instanceof Error ? lastError.message : 'Unknown error',
  })
}
