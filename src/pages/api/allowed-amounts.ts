import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await fetch(
      'https://tellorlayer.com/tellor-io/layer/reporter/allowed-amount'
    )

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()

    if (
      data?.staking_amount !== undefined &&
      data?.unstaking_amount !== undefined
    ) {
      res.status(200).json({
        staking_amount: data.staking_amount,
        unstaking_amount: data.unstaking_amount,
      })
    } else {
      throw new Error('Unexpected data structure from external API')
    }
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch allowed amounts',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
