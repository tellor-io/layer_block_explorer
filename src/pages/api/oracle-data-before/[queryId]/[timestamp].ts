import type { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '../../../../utils/rpcManager'

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

  try {
    const formattedQueryId = queryId.startsWith('0x')
      ? queryId.slice(2)
      : queryId
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')
    const url = `${baseEndpoint}/tellor-io/layer/oracle/get_data_before/${formattedQueryId}/${timestamp}`
    console.log('', url)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // If the response has code 2, it means no data found - this is a valid response
    if (data.code === 2) {
      return res.status(404).json({
        error: 'No data found',
        message: data.message,
        details: data.details,
      })
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch oracle data',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
