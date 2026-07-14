import axios from 'axios'
import type { NextApiRequest } from 'next'
import { rpcManager } from './rpcManager'

export function getBaseEndpoint(endpoint: string): string {
  return endpoint.endsWith('/rpc') ? endpoint.slice(0, -4) : endpoint.replace('/rpc', '')
}

export async function fetchWithRpcFailover(
  req: NextApiRequest,
  buildUrl: (baseEndpoint: string) => string,
  options?: { timeout?: number }
): Promise<{ data: unknown; endpoint: string }> {
  const customEndpoint = req.query.endpoint as string | undefined
  const activeNetworkEndpoints = rpcManager.getEndpointsForActiveNetwork()
  const endpointsToTry = customEndpoint
    ? [customEndpoint, ...activeNetworkEndpoints.filter((ep) => ep !== customEndpoint)]
    : activeNetworkEndpoints

  let lastError: unknown = null

  for (const endpoint of endpointsToTry) {
    try {
      const baseEndpoint = getBaseEndpoint(endpoint)
      const response = await axios.get(buildUrl(baseEndpoint), {
        timeout: options?.timeout ?? 10000,
        headers: { Accept: 'application/json' },
      })
      if (response.data) {
        await rpcManager.reportSuccess(endpoint)
        return { data: response.data, endpoint }
      }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('All RPC endpoints failed')
}
