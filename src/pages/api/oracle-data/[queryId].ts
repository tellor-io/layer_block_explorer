import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { queryId } = req.query

  if (!queryId || typeof queryId !== 'string') {
    return res.status(400).json({ error: 'Invalid query ID' })
  }

  try {
    const response = await fetch(
      `https://node-palmito.tellorlayer.com/tellor-io/layer/oracle/get_current_aggregate_report/${queryId}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching oracle data:', error)
    res.status(500).json({
      error: 'Failed to fetch oracle data',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
