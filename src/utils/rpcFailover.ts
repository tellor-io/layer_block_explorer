import axios from 'axios'
import type { NextApiRequest } from 'next'
import {
  LS_ACTIVE_NETWORK,
  LayerNetwork,
  normalizeNetwork,
} from './constant'
import { rpcManager } from './rpcManager'

export function getBaseEndpoint(endpoint: string): string {
  return endpoint.endsWith('/rpc') ? endpoint.slice(0, -4) : endpoint.replace('/rpc', '')
}

/** Resolve network from the ACTIVE_NETWORK cookie; default mainnet when unset. */
export function getNetworkFromRequest(req: NextApiRequest): LayerNetwork {
  return normalizeNetwork(req.cookies?.[LS_ACTIVE_NETWORK])
}

/** RPC endpoints for the request's selected network (cookie), not server singleton state. */
export function getRpcEndpointsFromRequest(req: NextApiRequest): string[] {
  return rpcManager.getEndpointsForNetwork(getNetworkFromRequest(req))
}

export async function fetchWithRpcFailover(
  req: NextApiRequest,
  buildUrl: (baseEndpoint: string) => string,
  options?: { timeout?: number }
): Promise<{ data: unknown; endpoint: string }> {
  const customEndpoint = req.query.endpoint as string | undefined
  const networkEndpoints = getRpcEndpointsFromRequest(req)
  const endpointsToTry = customEndpoint
    ? [customEndpoint, ...networkEndpoints.filter((ep) => ep !== customEndpoint)]
    : networkEndpoints

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
