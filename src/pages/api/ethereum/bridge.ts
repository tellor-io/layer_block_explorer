import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import BRIDGE_ABI from '@/abis/bridge.json'
import {
  getEthereumProvider,
  getBridgeContractAddress,
} from '@/utils/ethereumProvider'
import { rpcManager } from '@/utils/rpcManager'

interface APIDeposit {
  id: number
  sender: string
  recipient: string
  amount: string
  tip: string
  blockHeight: string
  blockTimestamp?: string
}

interface APIResponse {
  deposits?: APIDeposit[]
  claimed?: boolean
  id?: string
  error?: string
  details?: string
  success?: boolean
  network?: string
  chainId?: number
  layerEndpoint?: string
  contractAddress?: string
  depositId?: string
}

// Initialize provider dynamically based on Layer network
let provider: ethers.JsonRpcProvider | null = null
let lastLayerEndpoint: string | null = null

// Initialize contract
const getContract = async (forcedEndpoint?: string) => {
  let layerEndpoint: string

  if (forcedEndpoint && typeof forcedEndpoint === 'string') {
    layerEndpoint = forcedEndpoint
    console.log('Using forced endpoint:', layerEndpoint)
  } else {
    layerEndpoint = await rpcManager.getCurrentEndpoint()
    console.log('Using rpcManager endpoint:', layerEndpoint)
  }

  // Check if we need to update the provider (different endpoint)
  if (!provider || lastLayerEndpoint !== layerEndpoint) {
    provider = getEthereumProvider(layerEndpoint)
    lastLayerEndpoint = layerEndpoint
  }

  const contractAddress = getBridgeContractAddress(layerEndpoint)
  return new ethers.Contract(contractAddress, BRIDGE_ABI, provider)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  try {
    const { method, endpoint: forcedEndpoint } = req.query

    switch (method) {
      case 'deposits': {
        const contract = await getContract(forcedEndpoint as string)
        const layerEndpoint = await rpcManager.getCurrentEndpoint()
        try {
          const depositId = await contract.depositId()

          const deposits: APIDeposit[] = []

          for (let i = 1; i <= Number(depositId); i++) {
            try {
              const deposit = await contract.deposits(i)

              const block = await provider!.getBlock(
                Number(deposit.blockHeight)
              )

              deposits.push({
                id: i,
                sender: deposit.sender,
                recipient: deposit.recipient,
                amount: deposit.amount.toString(),
                tip: deposit.tip.toString(),
                blockHeight: deposit.blockHeight.toString(),
                blockTimestamp: block
                  ? new Date(Number(block.timestamp) * 1000).toISOString()
                  : undefined,
              })
            } catch (error) {
              // Skip deposits that can't be fetched
            }
          }

          return res.status(200).json({ deposits })
        } catch (error) {
          return res.status(500).json({
            error: 'Failed to fetch deposit ID',
            details: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      case 'withdrawClaimed': {
        const { id } = req.query
        const contract = await getContract(forcedEndpoint as string)
        const claimed = await contract.withdrawClaimed(id)
        return res.status(200).json({ claimed })
      }

      case 'depositId': {
        const contract = await getContract(forcedEndpoint as string)
        const id = await contract.depositId()
        return res.status(200).json({ id: id.toString() })
      }

      default:
        return res.status(400).json({ error: 'Invalid method' })
    }
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
