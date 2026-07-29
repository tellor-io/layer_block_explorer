/*
 * DEPRECATED: This API endpoint has been migrated to GraphQL
 * 
 * This endpoint was replaced by GraphQL queries in Phase 2 of the migration.
 * Validator delegations data is now fetched directly from GraphQL in components.
 * 
 * Migration Date: Phase 2
 * Replacement: Direct GraphQL queries in validator detail components
 * 
 * Original implementation preserved below for reference:
 */

/*
import type { NextApiRequest, NextApiResponse } from 'next'
import { graphqlQuery } from '../../../datasources/graphql/client'
import { GET_DELEGATIONS_BY_VALIDATOR } from '../../../datasources/graphql/queries'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { validatorAddress } = req.query

    if (!validatorAddress || typeof validatorAddress !== 'string') {
      return res.status(400).json({
        error: 'Validator address is required',
      })
    }

    // Use GraphQL to fetch delegations for the validator
    const result = await graphqlQuery(GET_DELEGATIONS_BY_VALIDATOR, {
      validatorAddressId: validatorAddress,
      first: 1000 // Get up to 1000 delegations to count them
    })

    if (!result.delegations) {
      throw new Error('No delegations data returned from GraphQL')
    }

    // Convert GraphQL response to expected format
    const delegations = result.delegations.edges.map((edge: any) => ({
      delegatorAddress: edge.node.delegatorAddress,
      validatorAddressId: edge.node.validatorAddressId,
      shares: edge.node.shares,
    }))

    const data = {
      delegations,
      count: delegations.length
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch validator delegations',
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
    message: 'Validator delegations data is now fetched directly from GraphQL in components',
    migrationPhase: 'Phase 2',
    replacement: 'Direct GraphQL queries in validator detail components'
  })
}