import { ethers } from 'ethers'

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? process.env.ALCHEMY_API_KEY

// Bridge contract addresses for different networks
const BRIDGE_CONTRACT_ADDRESSES = {
  mainnet: '0x5589e306b1920F009979a50B88caE32aecD471E4', // Mainnet address
  testnet: '0x5acb5977f35b1A91C4fE0F4386eB669E046776F2', // Sepolia address
}

export const getEthereumProvider = (
  layerEndpoint: string
): ethers.JsonRpcProvider => {
  if (!ALCHEMY_API_KEY) {
    throw new Error(
      'Missing Alchemy API key. Set NEXT_PUBLIC_ALCHEMY_API_KEY or ALCHEMY_API_KEY.'
    )
  }

  // Determine Ethereum network based on Layer endpoint
  const isMainnet = layerEndpoint.includes('mainnet.tellorlayer.com')

  const ethereumUrl = isMainnet
    ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    : `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`

  const networkConfig = isMainnet
    ? { name: 'mainnet', chainId: 1 }
    : { name: 'sepolia', chainId: 11155111 }

  return new ethers.JsonRpcProvider(ethereumUrl, networkConfig)
}

export const getBridgeContractAddress = (layerEndpoint: string): string => {
  const isMainnet = layerEndpoint.includes('mainnet.tellorlayer.com')
  const address = isMainnet
    ? BRIDGE_CONTRACT_ADDRESSES.mainnet
    : BRIDGE_CONTRACT_ADDRESSES.testnet

  return address
}
