import { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '../../../utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { proposalId } = req.query

  if (!proposalId || typeof proposalId !== 'string') {
    return res.status(400).json({ error: 'Proposal ID is required' })
  }

  try {
    const proposalIdNum = parseInt(proposalId, 10)
    if (isNaN(proposalIdNum)) {
      return res.status(400).json({ error: 'Invalid proposal ID' })
    }

    // Get RPC endpoint using the same method as other API endpoints
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')

    console.log(
      'Fetching proposal from:',
      `${baseEndpoint}/cosmos/gov/v1/proposals/${proposalIdNum}`
    )

    // Query the REST API endpoint for proposal details (v1 format)
    const response = await fetch(
      `${baseEndpoint}/cosmos/gov/v1/proposals/${proposalIdNum}`
    )

    console.log('Response status:', response.status)

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Proposal not found' })
      }
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Raw proposal data:', data)

    // Format the response to match our expected structure
    const proposal = data.proposal

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    // Parse v1 proposal format
    let messages = proposal.messages || []
    let metadata = proposal.metadata || ''
    let title = proposal.title || 'Untitled Proposal'
    let summary = proposal.summary || ''
    let proposer = proposal.proposer || ''
    let expedited = proposal.expedited || false
    let failedReason = proposal.failed_reason || ''

    // Extract message types
    let messageTypes = messages.map(
      (msg: any) => msg['@type'] || 'Unknown Type'
    )
    let primaryType = messageTypes[0] || 'Unknown Type'

    // Format messages for display
    let formattedMessages = messages.map((msg: any, index: number) => ({
      index: index + 1,
      type: msg['@type'] || 'Unknown Type',
      content: msg,
    }))

    // Format dates
    const formatDate = (dateString: string | null) => {
      if (!dateString) return null
      return new Date(dateString).toISOString()
    }

    const responseData = {
      proposalId: proposalIdNum,
      title,
      summary,
      metadata,
      proposer,
      expedited,
      failedReason,
      messages: formattedMessages,
      messageTypes,
      primaryType,
      status: proposal.status,
      submitTime: formatDate(proposal.submit_time),
      depositEndTime: formatDate(proposal.deposit_end_time),
      votingStartTime: formatDate(proposal.voting_start_time),
      votingEndTime: formatDate(proposal.voting_end_time),
      totalDeposit: proposal.total_deposit || [],
      tallyResult: proposal.final_tally_result
        ? {
            yes:
              proposal.final_tally_result.yes_count ||
              proposal.final_tally_result.yes ||
              '0',
            no:
              proposal.final_tally_result.no_count ||
              proposal.final_tally_result.no ||
              '0',
            abstain:
              proposal.final_tally_result.abstain_count ||
              proposal.final_tally_result.abstain ||
              '0',
            noWithVeto:
              proposal.final_tally_result.no_with_veto_count ||
              proposal.final_tally_result.no_with_veto ||
              '0',
          }
        : null,
    }

    console.log('Formatted response:', responseData)
    return res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching proposal:', error)
    return res.status(500).json({
      error: 'Failed to fetch proposal',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
