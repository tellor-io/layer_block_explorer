import type { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '../../utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const endpoint =
      (req.query.endpoint as string) || (await rpcManager.getCurrentEndpoint())
    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await fetch(
      `${baseEndpoint}/tellor-io/layer/reporter/allowed-amount`
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('External API error details:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: response.url,
      })
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Received staking amount data:', data)

    if (data?.staking_amount !== undefined) {
      res.status(200).json({ amount: data.staking_amount })
    } else {
      console.error('Unexpected data structure:', data)
      throw new Error('Unexpected data structure from external API')
    }
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch staking amount',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
