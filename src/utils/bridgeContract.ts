import { ethers } from 'ethers';
import BRIDGE_ABI from '../abis/bridge.json';

export const BRIDGE_CONTRACT_ADDRESS = '0x5acb5977f35b1A91C4fE0F4386eB669E046776F2';

export interface Deposit {
  id: number;
  sender: string;
  recipient: string;
  amount: bigint;
  tip: bigint;
  blockHeight: bigint;
}

let provider: ethers.JsonRpcProvider | null = null;

export const getProvider = () => {
  if (!provider) {
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!apiKey) {
      throw new Error('Alchemy API key not found in environment variables');
    }

    // Initialize provider with explicit network configuration
    provider = new ethers.JsonRpcProvider(
      `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`,
      {
        name: 'sepolia',
        chainId: 11155111
      }
    );
  }
  return provider;
};

export const getBridgeContract = () => {
  const provider = getProvider();
  return new ethers.Contract(BRIDGE_CONTRACT_ADDRESS, BRIDGE_ABI, provider);
};

// Add this new function to generate query ID for deposit reporting
export const generateDepositQueryId = (depositId: number): string => {
  const abiCoder = new ethers.AbiCoder();
  
  // First encode the inner data: (bool true, uint256 _depositId)
  const innerData = abiCoder.encode(
    ['bool', 'uint256'],
    [true, depositId]
  );
  
  // Then encode the full query data: ("TRBBridge", innerData)
  const queryData = abiCoder.encode(
    ['string', 'bytes'],
    ['TRBBridge', innerData]
  );
  
  // Generate the query ID using keccak256
  const queryId = ethers.keccak256(queryData);
  
  // Return the hex string without the 0x prefix
  return queryId.slice(2);
};

export const generateWithdrawalQueryId = (withdrawalId: number): string => {
  const abiCoder = new ethers.AbiCoder();
  
  // First encode the inner data: (bool false, uint256 _depositId)
  const innerData = abiCoder.encode(
    ['bool', 'uint256'],
    [false, withdrawalId]
  );
  
  // Then encode the full query data: ("TRBBridge", innerData)
  const queryData = abiCoder.encode(
    ['string', 'bytes'],
    ['TRBBridge', innerData]
  );
  
  // Generate the query ID using keccak256
  const queryId = ethers.keccak256(queryData);
  
  // Return the hex string without the 0x prefix
  return queryId.slice(2);
}; 