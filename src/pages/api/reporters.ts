/*
 * DEPRECATED: This API endpoint has been migrated to GraphQL
 * 
 * This endpoint was replaced by GraphQL queries in Phase 2 of the migration.
 * Reporters data is now fetched directly from GraphQL in components.
 * 
 * Migration Date: Phase 2
 * Replacement: Direct GraphQL queries in /src/pages/reporters/index.tsx
 * 
 * Original implementation preserved below for reference:
 */

/*
import type { NextApiRequest, NextApiResponse } from 'next'
import { graphqlQuery } from '../../datasources/graphql/client'
import { GET_REPORTERS } from '../../datasources/graphql/queries'

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

    // Use GraphQL to fetch reporters
    const first = perPage ? parseInt(perPage as string) : 20
    
    // Build orderBy parameter based on sortBy and sortOrder
    let orderBy = undefined
    if (sortBy && sortOrder) {
      const sortField = sortBy as string
      const order = sortOrder as string
      
      // Map frontend sort fields to GraphQL orderBy values
      const orderByMap: { [key: string]: string } = {
        'displayName': 'MONIKER',
        'min_tokens_required': 'MIN_TOKENS_REQUIRED',
        'commission_rate': 'COMMISSION_RATE',
        'jailed': 'JAILED',
        'selectors': 'SELECTORS_COUNT'
      }
      
      const graphqlField = orderByMap[sortField]
      if (graphqlField) {
        orderBy = `${graphqlField}_${order.toUpperCase()}`
      }
    }

    // Enhanced query for reporters with sorting
    const query = `
      query GetReporters($first: Int, $orderBy: [ReportersOrderBy!]) {
        reporters(first: $first, orderBy: $orderBy) {
          edges {
            node {
              id
              moniker
              jailed
              minTokensRequired
              commissionRate
              lastUpdated
              jailedUntil
              selectors {
                totalCount
              }
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

    if (!result.reporters) {
      throw new Error('No reporters data returned from GraphQL')
    }

    // Convert GraphQL response to expected format
    const reporters = result.reporters.edges.map((edge: any) => ({
      address: edge.node.id,
      power: "0", // Power field not available in GraphQL schema
      metadata: {
        moniker: edge.node.moniker,
        jailed: edge.node.jailed,
        min_tokens_required: edge.node.minTokensRequired,
        commission_rate: edge.node.commissionRate,
        last_updated: edge.node.lastUpdated,
        jailed_until: edge.node.jailedUntil,
        selectors: edge.node.selectors?.totalCount || 0
      }
    }))

    // Apply sorting if requested (client-side sorting)
    if (sortBy && reporters) {
      const sortField = sortBy as string
      const order = sortOrder === 'desc' ? -1 : 1

      reporters.sort((a: any, b: any) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        // Handle nested properties
        if (sortField === 'displayName') {
          aValue = a.address
          bValue = b.address
        } else if (sortField === 'power') {
          aValue = parseInt(a.power || '0')
          bValue = parseInt(b.power || '0')
        } else if (sortField === 'min_tokens_required') {
          aValue = parseInt(a.metadata?.min_tokens_required || '0')
          bValue = parseInt(b.metadata?.min_tokens_required || '0')
        } else if (sortField === 'commission_rate') {
          aValue = parseFloat(a.metadata?.commission_rate || '0')
          bValue = parseFloat(b.metadata?.commission_rate || '0')
        } else if (sortField === 'jailed') {
          aValue = a.metadata?.jailed ? 'Yes' : 'No'
          bValue = b.metadata?.jailed ? 'Yes' : 'No'
        }

        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue) * order
        }

        // Handle numeric comparison
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * order
        }

        return 0
      })
    }

    const data = {
      reporters,
      pagination: {
        total: result.reporters.pageInfo?.hasNextPage ? 'unknown' : reporters.length,
        page: page ? parseInt(page as string) : 1,
        perPage: first
      }
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch reporters',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// Helper function removed - use GraphQL client directly in components
*/

// Return deprecation notice
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(410).json({
    error: 'This API endpoint has been deprecated',
    message: 'Reporters data is now fetched directly from GraphQL in components',
    migrationPhase: 'Phase 2',
    replacement: 'Direct GraphQL queries in /src/pages/reporters/index.tsx'
  })
}
