import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getReporters } from '../../services/graphqlService'
import { rpcManager } from '../../utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Try GraphQL first
    const graphqlData = await getReporters()
    return res.status(200).json(graphqlData)
  } catch (graphqlError) {
    console.warn('GraphQL failed, falling back to RPC:', graphqlError)
    try {
      // Fallback to RPC
      const { endpoint: customEndpoint, rpc } = req.query
      
      // Use custom endpoint if provided, otherwise use RPC address from query, otherwise use rpcManager
      let endpoint: string
      if (customEndpoint) {
        endpoint = customEndpoint as string
      } else if (rpc) {
        endpoint = rpc as string
      } else {
        endpoint = await rpcManager.getCurrentEndpoint()
      }
      
      const baseEndpoint = endpoint.replace('/rpc', '')

      const response = await fetch(
        `${baseEndpoint}/tellor-io/layer/reporter/reporters`
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

export const getReporters = async (endpoint: string) => {
  try {
    const response = await axios.get('/api/reporters', {
      params: { endpoint },
    })
    return response.data
  } catch (error) {
    console.error('Failed to fetch reporters:', error)
    throw error
  }
}
