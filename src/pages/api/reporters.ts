import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '../../utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { endpoint: customEndpoint, rpc } = req.query

    // Use custom endpoint if provided, otherwise use RPC address from query, otherwise use rpcManager
    let endpoint: string
    if (customEndpoint) {
      endpoint = customEndpoint as string
    } else if (rpc) {
      endpoint = rpc as string
    } else {
      endpoint = await rpcManager.getCurrentEndpoint()
    }

    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await fetch(
      `${baseEndpoint}/tellor-io/layer/reporter/reporters`
    )

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch reporters',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export const getReporters = async (endpoint: string) => {
  try {
    const response = await axios.get('/api/reporters', {
      params: { endpoint },
    })
    return response.data
  } catch (error) {
    console.error('Failed to fetch reporters:', error)
    throw error
  }
}
