import { HttpClient, Tendermint37Client } from '@cosmjs/tendermint-rpc'
import { ProxyHttpClient } from '../proxy-client'

export const isBraveBrowser = () => {
  // @ts-ignore - Brave modifies navigator
  return navigator.brave?.isBrave?.() || false
}

export async function validateConnection(rpcAddress: string): Promise<Boolean> {
  try {
    const httpClient = new HttpClient(rpcAddress)
    const tmClient = await Tendermint37Client.create(httpClient)
    const status = await tmClient.status()
    return !!status
  } catch (error) {
    console.debug('Connection validation failed:', error)
    return false
  }
}

export async function connectWebsocketClient(
  rpcAddress: string
): Promise<Tendermint37Client | null> {
  try {
    // Check if we're in production (browser environment with CORS restrictions)
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // Use proxy client in production to avoid CORS issues
      const proxyClient = new ProxyHttpClient(rpcAddress)
      const tmClient = await Tendermint37Client.create(proxyClient)
      
      // Verify connection with a status check
      const status = await tmClient.status()
      if (!status) {
        throw new Error('Could not get client status')
      }
      
      return tmClient
    } else {
      // Use direct connection in development
      const httpClient = new HttpClient(rpcAddress)
      const tmClient = await Tendermint37Client.create(httpClient)

      // Verify connection with a status check
      const status = await tmClient.status()
      if (!status) {
        throw new Error('Could not get client status')
      }

      return tmClient
    }
  } catch (error) {
    console.error('Connection error:', error)
    throw error
  }
}
