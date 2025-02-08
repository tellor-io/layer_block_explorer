import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { rpcManager } from '@/utils/rpcManager'

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

  // Validate timestamp (should be in the past)
  let timestampNum = parseInt(timestamp, 10)
  const currentTime = Date.now()
  if (timestampNum > currentTime) {
    console.warn('Future timestamp detected, using current time instead')
    timestampNum = currentTime
  }

  let lastError = null
  const endpoints = ['https://tellorlayer.com', 'https://rpc.layer-node.com']

  for (const endpoint of endpoints) {
    try {
      const url = `${endpoint}/tellor-io/layer/oracle/get_reports_by_aggregate/${queryId}/${timestampNum}?pagination.limit=600`

      const response = await axios.get(url, {
        timeout: 5000, // Reduced timeout
        headers: {
          Accept: 'application/json',
        },
      })

      const data = response.data

      // Count unique reporters from microReports
      const uniqueReporters = new Set(
        data.microReports?.map((report: any) => report.reporter) || []
      )

      return res.status(200).json({
        count:
          uniqueReporters.size || parseInt(data.pagination?.total || '0', 10),
        endpoint,
      })
    } catch (error) {
      console.error(`Error with endpoint ${endpoint}:`, error)
      lastError = error
      continue // Try next endpoint
    }
  }

  // If we get here, all endpoints failed
  console.error('All endpoints failed')
  return res.status(500).json({
    error: 'Failed to fetch reporter count',
    details: lastError instanceof Error ? lastError.message : 'Unknown error',
  })
}
