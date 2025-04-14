import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import BRIDGE_ABI from '@/abis/bridge.json';

const BRIDGE_CONTRACT_ADDRESS = '0x5acb5977f35b1A91C4fE0F4386eB669E046776F2';

// Initialize provider
const provider = new ethers.JsonRpcProvider(
  process.env.SEPOLIA_RPC_URL,
  {
    name: 'sepolia',
    chainId: 11155111
  }
);

// Initialize contract
const contract = new ethers.Contract(BRIDGE_CONTRACT_ADDRESS, BRIDGE_ABI, provider);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method } = req.query;

    switch (method) {
      case 'deposits': {
        const depositId = await contract.depositId();
        const deposits = [];
        
        for (let i = 1; i <= Number(depositId); i++) {
          const deposit = await contract.deposits(i);
          const block = await provider.getBlock(Number(deposit.blockHeight));
          
          deposits.push({
            id: i,
            sender: deposit.sender,
            recipient: deposit.recipient,
            amount: deposit.amount.toString(),
            tip: deposit.tip.toString(),
            blockHeight: deposit.blockHeight.toString(),
            blockTimestamp: block ? new Date(Number(block.timestamp) * 1000).toISOString() : undefined
          });
        }
        
        return res.status(200).json(deposits);
      }

      case 'withdrawClaimed': {
        const { id } = req.query;
        const claimed = await contract.withdrawClaimed(id);
        return res.status(200).json({ claimed });
      }

      case 'depositId': {
        const id = await contract.depositId();
        return res.status(200).json({ id: id.toString() });
      }

      default:
        return res.status(400).json({ error: 'Invalid method' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}