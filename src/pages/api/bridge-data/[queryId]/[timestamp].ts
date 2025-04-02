import type { NextApiRequest, NextApiResponse } from 'next'
import { RPCManager } from '../../../../utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { queryId, timestamp } = req.query

  if (
    !queryId ||
    !timestamp ||
    typeof queryId !== 'string' ||
    typeof timestamp !== 'string'
  ) {
    return res
      .status(400)
      .json({ error: 'Query ID and timestamp are required' })
  }

  try {
    const rpcManager = new RPCManager()
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')
    
    // First, fetch snapshots
    const snapshotsResponse = await fetch(
      `${baseEndpoint}/layer/bridge/get_snapshots_by_report/${queryId}/${timestamp}`
    )

    if (!snapshotsResponse.ok) {
      const errorText = await snapshotsResponse.text()
      console.error('External API error response:', errorText)
      throw new Error(
        `External API responded with status: ${snapshotsResponse.status}, body: ${errorText}`
      )
    }

    const snapshotsData = await snapshotsResponse.json()

    if (
      !snapshotsData ||
      !snapshotsData.snapshots ||
      !Array.isArray(snapshotsData.snapshots)
    ) {
      console.error('Unexpected data format:', snapshotsData)
      throw new Error('Unexpected response format: missing snapshots array')
    }

    // Get the last snapshot
    const lastSnapshot =
      snapshotsData.snapshots[snapshotsData.snapshots.length - 1]

    // Fetch attestations for the last snapshot
    const attestationsResponse = await fetch(
      `${baseEndpoint}/layer/bridge/get_attestations_by_snapshot/${lastSnapshot}`
    )

    if (!attestationsResponse.ok) {
      const errorText = await attestationsResponse.text()
      console.error('Attestations API error response:', errorText)
      throw new Error(
        `Attestations API responded with status: ${attestationsResponse.status}, body: ${errorText}`
      )
    }

    const attestationsData = await attestationsResponse.json()

    // Return combined data
    res.status(200).json({
      snapshot: lastSnapshot,
      attestations: attestationsData,
    })
  } catch (error) {
    console.error('Full error details:', error)
    res.status(500).json({
      error: 'Failed to fetch data',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
