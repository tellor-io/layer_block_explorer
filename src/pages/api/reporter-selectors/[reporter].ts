import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { reporter } = req.query

  if (!reporter || typeof reporter !== 'string') {
    return res.status(400).json({ error: 'Reporter address is required' })
  }

  try {
    const response = await fetch(
      `https://tellorlayer.com/tellor-io/layer/reporter/num-of-selectors-by-reporter/${reporter}`
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching reporter selectors:', error)
    res.status(500).json({ error: 'Failed to fetch reporter selectors' })
  }
}
