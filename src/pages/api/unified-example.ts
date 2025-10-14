import { NextApiRequest, NextApiResponse } from 'next'
import { UnifiedDataService } from '../../utils/unifiedDataService'
import {
  dataSourceManager,
  DataSourceType,
  getDataSourceStatus,
} from '../../utils/dataSourceManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      type = 'latest-block',
      height,
      hash,
      limit = '20',
      offset = '0',
    } = req.query

    // Get data source status for monitoring
    const dataSourceStatus = getDataSourceStatus()
    const graphqlStatus = dataSourceStatus.get(DataSourceType.GRAPHQL)
    const rpcStatus = dataSourceStatus.get(DataSourceType.RPC)

    let result: any

    switch (type) {
      case 'latest-block':
        result = await UnifiedDataService.getLatestBlock({
          timeout: 10000,
          retries: 2,
          fallbackOnError: true,
        })
        break

      case 'block-by-height':
        if (!height) {
          return res.status(400).json({ error: 'Height parameter is required' })
        }
        result = await UnifiedDataService.getBlockByHeight(Number(height), {
          timeout: 10000,
          retries: 2,
          fallbackOnError: true,
        })
        break

      case 'blocks':
        result = await UnifiedDataService.getBlocks(
          Number(limit),
          Number(offset),
          {
            timeout: 15000,
            retries: 2,
            fallbackOnError: true,
          }
        )
        break

      case 'transaction':
        if (!hash) {
          return res.status(400).json({ error: 'Hash parameter is required' })
        }
        result = await UnifiedDataService.getTransactionByHash(hash as string, {
          timeout: 10000,
          retries: 2,
          fallbackOnError: true,
        })
        break

      case 'transactions':
        result = await UnifiedDataService.getTransactions(
          Number(limit),
          Number(offset),
          {
            timeout: 15000,
            retries: 2,
            fallbackOnError: true,
          }
        )
        break

      case 'validators':
        result = await UnifiedDataService.getValidators({
          timeout: 10000,
          retries: 2,
          fallbackOnError: true,
        })
        break

      case 'reporters':
        result = await UnifiedDataService.getReporters({
          timeout: 10000,
          retries: 2,
          fallbackOnError: true,
        })
        break

      case 'status':
        // Return data source status information
        return res.status(200).json({
          dataSources: {
            graphql: graphqlStatus,
            rpc: rpcStatus,
          },
          timestamp: new Date().toISOString(),
        })

      default:
        return res.status(400).json({
          error:
            'Invalid type parameter. Valid types: latest-block, block-by-height, blocks, transaction, transactions, validators, reporters, status',
        })
    }

    // Return the result with metadata about which data source was used
    return res.status(200).json({
      data: result.data,
      metadata: {
        source: result.source,
        responseTime: result.responseTime,
        fallbackUsed: result.fallbackUsed,
        cached: result.cached,
        timestamp: new Date().toISOString(),
      },
      dataSourceStatus: {
        graphql: graphqlStatus,
        rpc: rpcStatus,
      },
    })
  } catch (error) {
    console.error('Unified API error:', error)

    // Get current data source status for debugging
    const dataSourceStatus = getDataSourceStatus()

    return res.status(500).json({
      error: 'Failed to fetch data',
      message: error instanceof Error ? error.message : 'Unknown error',
      dataSourceStatus: {
        graphql: dataSourceStatus.get(DataSourceType.GRAPHQL),
        rpc: dataSourceStatus.get(DataSourceType.RPC),
      },
      timestamp: new Date().toISOString(),
    })
  }
}

// Example usage:
// GET /api/unified-example?type=latest-block
// GET /api/unified-example?type=block-by-height&height=12345
// GET /api/unified-example?type=blocks&limit=10&offset=0
// GET /api/unified-example?type=transaction&hash=0x123...
// GET /api/unified-example?type=validators
// GET /api/unified-example?type=status
