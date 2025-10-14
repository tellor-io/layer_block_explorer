import type { NextApiRequest, NextApiResponse } from 'next'
import { getLatestBlock } from '../../services/graphqlService'
import { rpcManager } from '../../utils/rpcManager'
import { Tendermint37Client } from '@cosmjs/tendermint-rpc'
import { StargateClient } from '@cosmjs/stargate'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Try GraphQL first
    const graphqlData = await getLatestBlock()
    return res.status(200).json(graphqlData)
  } catch (graphqlError) {
    console.warn('GraphQL failed, falling back to RPC:', graphqlError)
    try {
      // Fallback to RPC
      const endpoint =
        (req.query.endpoint as string) || (await rpcManager.getCurrentEndpoint())
        
      // Use Tendermint RPC client instead of REST API
      const tmClient = await Tendermint37Client.connect(endpoint)
      const client = await StargateClient.create(tmClient)
      
      const block = await client.getBlock()
      
      // Convert the block to the expected format
      const blockData = {
        block: {
          header: {
            version: block.header.version,
            chain_id: block.header.chainId,
            height: block.header.height.toString(),
            time: block.header.time,
            // Note: Some properties might not be available in the BlockHeader type
            // We'll use the raw block data if available
          },
          data: {
            txs: block.txs.map(tx => Buffer.from(tx).toString('base64')),
          },
          // Note: evidence and last_commit might not be available in the Block type
        },
      }
      
      return res.status(200).json(blockData)
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
