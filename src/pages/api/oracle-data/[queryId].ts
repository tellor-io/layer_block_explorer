import type { NextApiRequest, NextApiResponse } from 'next'
import { getOracleData } from '../../../services/graphqlService'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { queryId } = req.query

  if (!queryId || typeof queryId !== 'string') {
    return res.status(400).json({ error: 'Invalid query ID' })
  }

  try {
    // Use GraphQL as primary data source
    const graphqlData = await getOracleData(queryId)
    return res.status(200).json(graphqlData)
  } catch (error) {
    console.error('GraphQL failed:', error)
    return res.status(500).json({
      error: 'Failed to fetch oracle data',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
