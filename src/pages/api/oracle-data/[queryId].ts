import type { NextApiRequest, NextApiResponse } from 'next'
import { getOracleData } from '../../../services/graphqlService'
import { RPCManager } from '@/utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { queryId, endpoint: forcedEndpoint } = req.query

  if (!queryId || typeof queryId !== 'string') {
    return res.status(400).json({ error: 'Invalid query ID' })
  }

  try {
    // Try GraphQL first
    const graphqlData = await getOracleData(queryId)
    return res.status(200).json(graphqlData)
  } catch (graphqlError) {
    console.warn('GraphQL failed, falling back to RPC:', graphqlError)
    try {
      // Fallback to RPC
      let endpoint: string
      if (forcedEndpoint && typeof forcedEndpoint === 'string') {
        endpoint = forcedEndpoint
      } else {
        const rpcManager = RPCManager.getInstance()
        endpoint = await rpcManager.getCurrentEndpoint()
      }
      const baseEndpoint = endpoint.replace('/rpc', '')

      const response = await fetch(
        `${baseEndpoint}/tellor-io/layer/oracle/get_current_aggregate_report/${queryId}`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`External API responded with status: ${response.status}`)
      }

      const data = await response.json()
      return res.status(200).json(data)
    } catch (rpcError) {
      console.error('Both GraphQL and RPC failed:', { graphqlError, rpcError })
      return res.status(500).json({ 
        error: 'Both data sources failed',
        details: {
          graphql: graphqlError instanceof Error ? graphqlError.message : 'Unknown GraphQL error',
          rpc: rpcError instanceof Error ? rpcError.message : 'Unknown RPC error'
        }
      })
    }
  }
}
