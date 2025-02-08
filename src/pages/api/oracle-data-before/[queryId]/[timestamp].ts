import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { queryId, timestamp } = req.query

  if (
    !queryId ||
    !timestamp ||
    typeof queryId !== 'string' ||
    typeof timestamp !== 'string'
  ) {
    return res
      .status(400)
      .json({ error: 'Query ID and timestamp are required' })
  }

  try {
    const formattedQueryId = queryId.startsWith('0x')
      ? queryId.slice(2)
      : queryId
    const url = `https://tellorlayer.com/tellor-io/layer/oracle/get_data_before/${formattedQueryId}/${timestamp}`
    console.log('', url)

    const response = await fetch(url)
    const data = await response.json()

    // If the response has code 2, it means no data found - this is a valid response
    if (data.code === 2) {
      return res.status(404).json({
        error: 'No data found',
        message: data.message,
        details: data.details,
      })
    }

    // For other non-200 responses, treat as error
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching oracle data before:', error)
    res.status(500).json({
      error: 'Failed to fetch oracle data before',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
