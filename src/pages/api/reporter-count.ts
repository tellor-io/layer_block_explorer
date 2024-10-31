import type { NextApiRequest, NextApiResponse } from 'next'

interface ReporterResponse {
  reporters: Array<{
    address: string
    metadata: {
      min_tokens_required: string
      commission_rate: string
      jailed: boolean
      jailed_until: string
    }
  }>
  pagination: {
    next_key: null | string
    total: string
  }
}

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await fetch(
      'https://tellorlayer.com/tellor-io/layer/reporter/reporters'
    )

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data: ReporterResponse = await response.json()

    // Use either the pagination total or the array length
    const count = data.pagination.total
      ? parseInt(data.pagination.total)
      : data.reporters.length

    res.status(200).json({ count })
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch reporter count',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
