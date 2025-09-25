import type { NextApiRequest, NextApiResponse } from 'next'
import { getBlockByHeight } from '../../../services/graphqlService'
import { rpcManager } from '../../../utils/rpcManager'
import { Tendermint37Client } from '@cosmjs/tendermint-rpc'
import { StargateClient } from '@cosmjs/stargate'
import axios from 'axios'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { height } = req.query

  if (!height || typeof height !== 'string') {
    return res.status(400).json({ error: 'Height is required' })
  }

  try {
    // Try GraphQL first
    const graphqlData = await getBlockByHeight(parseInt(height, 10))
    return res.status(200).json(graphqlData)
  } catch (graphqlError) {
    console.warn('GraphQL failed, falling back to RPC:', graphqlError)
    try {
      // Fallback to RPC
      const endpoint = await rpcManager.getCurrentEndpoint()
      
      // Use Stargate client for main block data
      const tmClient = await Tendermint37Client.connect(endpoint)
      const client = await StargateClient.create(tmClient)
      const block = await client.getBlock(parseInt(height, 10))
      
      // Get raw block data for additional header fields
      const rawBlockResponse = await axios.get(`${endpoint}/block?height=${height}`)
      const rawBlock = rawBlockResponse.data.result.block
      
      // Convert the block to the expected format with all required fields
      const blockData = {
        block: {
          header: {
            version: block.header.version,
            chain_id: block.header.chainId,
            height: block.header.height.toString(),
            time: block.header.time,
            proposer_address: rawBlock.header.proposer_address,
            last_block_id: rawBlock.last_commit?.block_id,
            last_commit_hash: rawBlock.header.last_commit_hash,
            data_hash: rawBlock.header.data_hash,
            validators_hash: rawBlock.header.validators_hash,
            next_validators_hash: rawBlock.header.next_validators_hash,
            consensus_hash: rawBlock.header.consensus_hash,
            app_hash: rawBlock.header.app_hash,
            last_results_hash: rawBlock.header.last_results_hash,
            evidence_hash: rawBlock.header.evidence_hash,
          },
          data: {
            txs: block.txs.map(tx => Buffer.from(tx).toString('base64')),
          },
          last_commit: rawBlock.last_commit,
          evidence: rawBlock.evidence,
          block_id: rawBlock.block_id,
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
        },
        response: (rpcError as any)?.response?.data
      })
    }
  }
}
