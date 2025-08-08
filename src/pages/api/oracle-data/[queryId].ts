import type { NextApiRequest, NextApiResponse } from 'next'
import { RPCManager } from '@/utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { queryId, endpoint: forcedEndpoint } = req.query

  if (!queryId || typeof queryId !== 'string') {
    return res.status(400).json({ error: 'Invalid query ID' })
  }

  try {
    let endpoint: string
    if (forcedEndpoint && typeof forcedEndpoint === 'string') {
      endpoint = forcedEndpoint
    } else {
      const rpcManager = RPCManager.getInstance()
      endpoint = await rpcManager.getCurrentEndpoint()
    }
    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await fetch(
      `${baseEndpoint}/tellor-io/layer/oracle/get_current_aggregate_report/${queryId}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch oracle data',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
