// =============================================================================
// CONFIGURATION TEST API ENDPOINT
// =============================================================================

import { NextApiRequest, NextApiResponse } from 'next'
import { runAllConfigurationTests } from '../../../utils/configTest'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🧪 Running configuration tests...')
    const results = runAllConfigurationTests()

    return res.status(200).json({
      success: true,
      message: 'Configuration tests completed successfully',
      results: {
        validation: results.validation,
        health: results.health,
        envValidation: results.envValidation,
        summary: results.summary,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Configuration test error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to run configuration tests',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
