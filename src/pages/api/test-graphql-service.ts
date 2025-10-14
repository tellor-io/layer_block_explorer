import type { NextApiRequest, NextApiResponse } from 'next'
import { GraphQLService } from '../../services/graphqlService'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { test } = req.query

  try {
    let result: any

    switch (test) {
      case 'latest-block':
        result = await GraphQLService.getLatestBlock()
        break
      
      case 'validators':
        result = await GraphQLService.getValidators()
        break
      
      case 'reporters':
        result = await GraphQLService.getReporters()
        break
      
      case 'bridge-deposits':
        result = await GraphQLService.getBridgeDeposits()
        break
      
      case 'aggregate-reports':
        result = await GraphQLService.getAggregateReports()
        break
      
      default:
        return res.status(400).json({ 
          error: 'Invalid test parameter',
          availableTests: [
            'latest-block',
            'validators', 
            'reporters',
            'bridge-deposits',
            'aggregate-reports'
          ]
        })
    }

    res.status(200).json({
      success: true,
      test,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('GraphQL Service Test Error:', error)
    res.status(500).json({
      error: 'GraphQL service test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      test,
      timestamp: new Date().toISOString()
    })
  }
}
