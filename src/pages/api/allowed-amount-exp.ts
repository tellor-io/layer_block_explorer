import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await fetch(
      'https://tellorlayer.com/tellor-io/layer/reporter/allowed-amount-expiration'
    )

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()

    const expiration = BigInt(data?.expiration)
    const expirationNum = Number(expiration)

    if (!isNaN(expirationNum)) {
      res.status(200).json({ expiration: expirationNum })
    } else {
      throw new Error(`Invalid expiration value: ${data?.expiration}`)
    }
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch expiration',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
