import type { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '@/utils/rpcManager'
import { LS_ACTIVE_NETWORK } from '@/utils/constant'
import axios from 'axios'

/**
 * API endpoint to fetch reporter power from RPC
 * This complements GraphQL data which doesn't include power field
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const endpoint =
      (req.query.endpoint as string) ||
      (await rpcManager.getCurrentEndpoint(req.cookies[LS_ACTIVE_NETWORK]))
    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await axios.get(
      `${baseEndpoint}/tellor-io/layer/reporter/reporters`,
      {
        timeout: 10000,
        headers: { Accept: 'application/json' },
      }
    )

    if (!response.data || !response.data.reporters) {
      throw new Error('Invalid response from RPC endpoint')
    }

    // Create a map of reporter address to power
    const powerMap: { [key: string]: string } = {}
    response.data.reporters.forEach((reporter: any) => {
      if (reporter.address && reporter.power !== undefined) {
        powerMap[reporter.address] = reporter.power
      }
    })

    res.status(200).json({ powerMap })
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch reporter power',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

