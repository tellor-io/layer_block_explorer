import { HttpClient, Tendermint37Client } from '@cosmjs/tendermint-rpc'

export const isBraveBrowser = () => {
  // @ts-ignore - Brave modifies navigator
  return navigator.brave?.isBrave?.() || false
}

export async function validateConnection(rpcAddress: string): Promise<Boolean> {
  return new Promise((resolve) => {
    const wsUrl = replaceHTTPtoWebsocket(rpcAddress)
    const path = wsUrl.endsWith('/') ? 'websocket' : '/websocket'
    const socket = new StreamingSocket(wsUrl + path, 3000)
    socket.events.subscribe({
      error: () => {
        resolve(false)
      },
    })

    socket.connect()
    socket.connected.then(() => resolve(true)).catch(() => resolve(false))
  })
}

export async function connectWebsocketClient(
  rpcAddress: string
): Promise<Tendermint37Client | null> {
  try {
    // Create HTTP client instead of WebSocket
    const httpClient = new HttpClient(rpcAddress)
    const tmClient = await Tendermint37Client.create(httpClient)
    
    // Verify connection with a status check
    const status = await tmClient.status()
    if (!status) {
      throw new Error('Could not get client status')
    }

    console.log('Successfully connected via HTTP RPC:', {
      moniker: status.nodeInfo.moniker,
      version: status.nodeInfo.version,
      network: status.nodeInfo.network,
    })

    return tmClient
  } catch (error) {
    console.error('Connection error:', error)
    throw error
  }
}
