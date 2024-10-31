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
    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({ error: 'Failed to fetch staking amount' })
  }
}
