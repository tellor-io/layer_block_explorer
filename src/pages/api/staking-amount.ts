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
      console.error(
        'External API error:',
        response.status,
        await response.text()
      )
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Add more specific error handling and data validation
    if (typeof data?.allowed_staking_amount === 'string') {
      res.status(200).json({ amount: data.allowed_staking_amount })
    } else {
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
