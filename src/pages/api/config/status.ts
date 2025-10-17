// =============================================================================
// CONFIGURATION STATUS API ENDPOINT
// =============================================================================

import { NextApiRequest, NextApiResponse } from 'next'
import {
  validateConfiguration,
  checkConfigHealth,
  getConfigSummary,
  validateEnvironmentVariables,
  getRecommendedConfig,
} from '../../../utils/configValidator'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { type = 'full' } = req.query

    switch (type) {
      case 'validation':
        const validation = validateConfiguration()
        return res.status(200).json({
          success: true,
          data: validation,
        })

      case 'health':
        const health = checkConfigHealth()
        return res.status(200).json({
          success: true,
          data: health,
        })

      case 'summary':
        const summary = getConfigSummary()
        return res.status(200).json({
          success: true,
          data: summary,
        })

      case 'environment':
        const envValidation = validateEnvironmentVariables()
        return res.status(200).json({
          success: true,
          data: envValidation,
        })

      case 'recommendations':
        const { env = 'development' } = req.query
        const recommendations = getRecommendedConfig(
          env as 'development' | 'staging' | 'production'
        )
        return res.status(200).json({
          success: true,
          data: {
            environment: env,
            recommendedConfig: recommendations,
          },
        })

      case 'full':
      default:
        const fullData = {
          validation: validateConfiguration(),
          health: checkConfigHealth(),
          summary: getConfigSummary(),
          environment: validateEnvironmentVariables(),
          recommendations: {
            development: getRecommendedConfig('development'),
            staging: getRecommendedConfig('staging'),
            production: getRecommendedConfig('production'),
          },
        }
        return res.status(200).json({
          success: true,
          data: fullData,
        })
    }
  } catch (error) {
    console.error('Configuration status error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get configuration status',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
