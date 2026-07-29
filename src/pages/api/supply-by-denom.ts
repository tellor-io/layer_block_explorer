import type { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '../../utils/rpcManager'
import { LS_ACTIVE_NETWORK } from '@/utils/constant'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const endpoint =
      (req.query.endpoint as string) ||
      (await rpcManager.getCurrentEndpoint(req.cookies[LS_ACTIVE_NETWORK]))
    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await fetch(
      `${baseEndpoint}/cosmos/bank/v1beta1/supply`
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('External API error details:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: response.url,
      })
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Find the loya denom in the supply array
    const loyaSupply = data?.supply?.find(
      (item: { denom: string; amount: string }) => item.denom === 'loya'
    )

    if (!loyaSupply || !loyaSupply.amount) {
      console.error('Loya supply not found in response:', data)
      throw new Error('Loya supply not found in response')
    }

    // Convert from loya to TRB (1 TRB = 1,000,000 loya)
    const loyaAmount = Number(loyaSupply.amount)
    const trbAmount = loyaAmount / 1_000_000

    // Format with 4 decimal points
    const formattedAmount = trbAmount.toFixed(4)

    res.status(200).json({
      amount: {
        amount: formattedAmount,
      },
    })
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch supply by denom',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

