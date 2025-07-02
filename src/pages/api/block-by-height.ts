import type { NextApiRequest, NextApiResponse } from 'next'
import { RPCManager } from '../../utils/rpcManager'
import { Tendermint37Client } from '@cosmjs/tendermint-rpc'
import { StargateClient } from '@cosmjs/stargate'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { height } = req.query

  if (!height || typeof height !== 'string') {
    return res.status(400).json({ error: 'Height is required' })
  }

  try {
    const rpcManager = RPCManager.getInstance()
    const endpoint = await rpcManager.getCurrentEndpoint()
    
    console.log('Block by height API: Using Tendermint RPC endpoint:', endpoint)
    
    // Use Tendermint RPC client instead of REST API
    const tmClient = await Tendermint37Client.connect(endpoint)
    const client = await StargateClient.create(tmClient)
    
    const block = await client.getBlock(parseInt(height, 10))
    
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
    
    console.log('Block by height API: Successfully fetched block data')
    res.status(200).json(blockData)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch block',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
