/*
 * DEPRECATED: This API endpoint has been migrated to GraphQL
 * 
 * This endpoint was replaced by GraphQL queries in Phase 2 of the migration.
 * Proposals data is now fetched directly from GraphQL in components.
 * 
 * Migration Date: Phase 2
 * Replacement: Direct GraphQL queries in /src/pages/proposals/index.tsx
 * 
 * Original implementation preserved below for reference:
 */

/*
import type { NextApiRequest, NextApiResponse } from 'next'
import { graphqlQuery } from '../../datasources/graphql/client'
import { GET_GOV_PROPOSALS } from '../../datasources/graphql/queries'

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

    // Use GraphQL to fetch proposals
    const first = perPage ? parseInt(perPage as string) : 20
    
    // Build orderBy parameter based on sortBy and sortOrder
    let orderBy = undefined
    if (sortBy && sortOrder) {
      const sortField = sortBy as string
      const order = sortOrder as string
      
      // Map frontend sort fields to GraphQL orderBy values
      const orderByMap: { [key: string]: string } = {
        'proposalId': 'PROPOSAL_ID',
        'title': 'TITLE',
        'status': 'STATUS',
        'submitTime': 'SUBMIT_TIME',
        'votingEndTime': 'VOTING_END_TIME'
      }
      
      const graphqlField = orderByMap[sortField]
      if (graphqlField) {
        orderBy = `${graphqlField}_${order.toUpperCase()}`
      }
    }

    // Enhanced query for proposals with sorting
    const query = `
      query GetGovProposals($first: Int, $orderBy: [GovProposalsOrderBy!]) {
        govProposals(first: $first, orderBy: $orderBy) {
          edges {
            node {
              proposalId
              title
              status
              submitTime
              votingStartTime
              votingEndTime
              messages
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

    if (!result.govProposals) {
      throw new Error('No proposals data returned from GraphQL')
    }

    // Convert GraphQL response to expected format
    const proposals = result.govProposals.edges.map((edge: any) => ({
      proposalId: edge.node.proposalId,
      title: edge.node.title,
      status: edge.node.status,
      submitTime: edge.node.submitTime,
      votingStartTime: edge.node.votingStartTime,
      votingEndTime: edge.node.votingEndTime,
      messages: edge.node.messages,
    }))

    const data = {
      proposals,
      pagination: {
        total: result.govProposals.pageInfo?.hasNextPage ? 'unknown' : proposals.length,
        page: page ? parseInt(page as string) : 1,
        perPage: first
      }
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch proposals',
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
    message: 'Proposals data is now fetched directly from GraphQL in components',
    migrationPhase: 'Phase 2',
    replacement: 'Direct GraphQL queries in /src/pages/proposals/index.tsx'
  })
}
