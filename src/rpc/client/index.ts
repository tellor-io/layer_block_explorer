import { replaceHTTPtoWebsocket } from '@/utils/helper'
import { Tendermint37Client, WebsocketClient } from '@cosmjs/tendermint-rpc'
import { StreamingSocket } from '@cosmjs/socket'

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
    if (isBraveBrowser()) {
    }

    const wsUrl = replaceHTTPtoWebsocket(rpcAddress)
    // Remove trailing slash if it exists and add websocket path
    const baseUrl = wsUrl.endsWith('/') ? wsUrl.slice(0, -1) : wsUrl
    const fullUrl = `${baseUrl}`

    console.log('Attempting to connect to:', fullUrl)

    // Create WebSocket client without error handler to match main branch
    const wsClient = new WebsocketClient(fullUrl)
    const tmClient = await Tendermint37Client.create(wsClient)

    // Verify connection with a status check
    const status = await tmClient.status()
    if (!status) {
      throw new Error('Could not get client status')
    }

    return tmClient
  } catch (error) {
    console.error('Connection error:', error)
    throw error
  }
}
