import { HttpClient, HttpEndpoint } from '@cosmjs/tendermint-rpc'

export class ProxyHttpClient extends HttpClient {
  private readonly proxyUrl: string
  private readonly originalUrl: string

  constructor(
    endpoint: string | HttpEndpoint,
    proxyUrl: string = '/api/rpc-proxy'
  ) {
    super(endpoint)
    this.proxyUrl = proxyUrl
    this.originalUrl = typeof endpoint === 'string' ? endpoint : endpoint.url
  }

  async request(method: string, params?: any[]): Promise<any> {
    // Check if we're in production (browser environment with CORS restrictions)
    if (
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost'
    ) {
      // Use proxy in production to avoid CORS issues
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          params: params || [],
          id: Math.floor(Math.random() * 1000000),
        }),
      })

      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(`RPC error: ${data.error.message}`)
      }

      return data.result
    } else {
      // Use direct connection in development - create a new HttpClient for this request
      const directClient = new HttpClient(this.originalUrl)
      return directClient.execute({
        jsonrpc: '2.0',
        method,
        params: params || [],
        id: Math.floor(Math.random() * 1000000),
      })
    }
  }
}
