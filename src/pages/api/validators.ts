import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await fetch(
      'https://tellorlayer.com/cosmos/staking/v1beta1/validators'
    )

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch validators',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
