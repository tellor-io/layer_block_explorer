import { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '@/utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { method, params, id } = req.body

  if (!method) {
    return res.status(400).json({ error: 'Method is required' })
  }

  try {
    // Get the current endpoint from the RPC manager
    const currentEndpoint = await rpcManager.getCurrentEndpoint()

    // Make the RPC request
    const response = await fetch(currentEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params: params || [],
        id: id || 1,
      }),
    })

    if (!response.ok) {
      console.warn(
        `RPC request failed with status ${response.status} for method ${method}`
      )
      // Report failure to RPC manager
      await rpcManager.reportFailure(currentEndpoint)

      return res.status(200).json({
        jsonrpc: '2.0',
        error: {
          code: response.status,
          message: 'RPC request failed',
        },
        id: id || 1,
      })
    }

    const data = await response.json()

    // Report success to RPC manager
    await rpcManager.reportSuccess(currentEndpoint)

    return res.status(200).json(data)
  } catch (error) {
    console.error('Error in RPC proxy:', error)

    // Report failure to RPC manager
    try {
      const currentEndpoint = await rpcManager.getCurrentEndpoint()
      await rpcManager.reportFailure(currentEndpoint)
    } catch (rpcError) {
      console.error('Error reporting RPC failure:', rpcError)
    }

    return res.status(200).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error',
      },
      id: id || 1,
    })
  }
}
