/*
 * DEPRECATED: This API endpoint has been migrated to GraphQL
 * 
 * This endpoint was replaced by GraphQL queries in Phase 2 of the migration.
 * Latest block data is now fetched directly from GraphQL in components.
 * 
 * Migration Date: Phase 2
 * Replacement: Direct GraphQL queries in /src/pages/blocks/index.tsx
 * 
 * Original implementation preserved below for reference:
 */

/*
import type { NextApiRequest, NextApiResponse } from 'next'
import { graphqlQuery } from '../../datasources/graphql/client'
import { GET_SINGLE_LATEST_BLOCK } from '../../datasources/graphql/queries'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Use GraphQL instead of RPC
    const result = await graphqlQuery(GET_SINGLE_LATEST_BLOCK)
    
    if (!result.blocks?.edges?.[0]?.node) {
      throw new Error('No block data returned from GraphQL')
    }

    const blockNode = result.blocks.edges[0].node
    
    // Convert GraphQL response to expected format
    const blockData = {
      block: {
        header: {
          height: blockNode.blockHeight,
          time: blockNode.blockTime,
          // Add other fields as needed from GraphQL response
        },
        data: {
          txs: [], // GraphQL doesn't provide transaction data in this query
        },
      },
    }

    res.status(200).json(blockData)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch latest block',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
*/

// Return deprecation notice
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(410).json({
    error: 'This API endpoint has been deprecated',
    message: 'Latest block data is now fetched directly from GraphQL in components',
    migrationPhase: 'Phase 2',
    replacement: 'Direct GraphQL queries in /src/pages/blocks/index.tsx'
  })
}
