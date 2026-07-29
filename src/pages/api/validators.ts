/*
 * DEPRECATED: This API endpoint has been migrated to GraphQL
 * 
 * This endpoint was replaced by GraphQL queries in Phase 2 of the migration.
 * Validators data is now fetched directly from GraphQL in components.
 * 
 * Migration Date: Phase 2
 * Replacement: Direct GraphQL queries in /src/pages/validators/index.tsx
 * 
 * Original implementation preserved below for reference:
 */

/*
import type { NextApiRequest, NextApiResponse } from 'next'
import { graphqlQuery } from '../../datasources/graphql/client'
import { GET_VALIDATORS } from '../../datasources/graphql/queries'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const {
      sortBy,
      sortOrder,
      page,
      perPage,
    } = req.query

    // Use GraphQL to fetch validators
    const first = perPage ? parseInt(perPage as string) : 20
    
    // Build orderBy parameter based on sortBy and sortOrder
    let orderBy = undefined
    if (sortBy && sortOrder) {
      const sortField = sortBy as string
      const order = sortOrder as string
      
      // Map frontend sort fields to GraphQL orderBy values
      const orderByMap: { [key: string]: string } = {
        'moniker': 'DESCRIPTION',
        'tokens': 'TOKENS',
        'commission': 'COMMISSION',
        'jailed': 'JAILED',
        'bondStatus': 'BOND_STATUS'
      }
      
      const graphqlField = orderByMap[sortField]
      if (graphqlField) {
        orderBy = `${graphqlField}_${order.toUpperCase()}`
      }
    }

    // Enhanced query for validators with sorting
    const query = `
      query GetValidators($first: Int, $orderBy: [ValidatorsOrderBy!]) {
        validators(first: $first, orderBy: $orderBy) {
          edges {
            node {
              operatorAddress
              consensusPubkey
              bondStatus
              tokens
              commission
              description
              jailed
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `

    const result = await graphqlQuery(query, {
      first,
      orderBy: orderBy ? [orderBy] : undefined
    })

    if (!result.validators) {
      throw new Error('No validators data returned from GraphQL')
    }

    // Convert GraphQL response to expected format
    const validators = result.validators.edges.map((edge: any) => ({
      operatorAddress: edge.node.operatorAddress,
      consensusPubkey: edge.node.consensusPubkey,
      bondStatus: edge.node.bondStatus,
      tokens: edge.node.tokens,
      commission: edge.node.commission,
      description: edge.node.description,
      jailed: edge.node.jailed,
    }))

    const data = {
      validators,
      pagination: {
        total: result.validators.pageInfo?.hasNextPage ? 'unknown' : validators.length,
        page: page ? parseInt(page as string) : 1,
        perPage: first
      }
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch validators',
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
    message: 'Validators data is now fetched directly from GraphQL in components',
    migrationPhase: 'Phase 2',
    replacement: 'Direct GraphQL queries in /src/pages/validators/index.tsx'
  })
}