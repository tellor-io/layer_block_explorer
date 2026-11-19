// Shared request handling for the API routes that serve decoded indexer data.
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  LS_ACTIVE_NETWORK,
  LayerNetwork,
  normalizeNetwork,
} from '@/utils/constant'

export function firstValue(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

// The browser names the network it is showing; the cookie written by the network switcher is the fallback
export function networkFromRequest(req: NextApiRequest): LayerNetwork {
  const requested = firstValue(req.query.network)
  if (requested && normalizeNetwork(requested) === requested) {
    return requested as LayerNetwork
  }
  return normalizeNetwork(req.cookies?.[LS_ACTIVE_NETWORK])
}

// Page size from the query string, bounded so one request cannot ask the indexer for an unbounded page
export function pageSize(
  value: string | string[] | undefined,
  fallback: number,
  max: number
): number {
  const parsed = parseInt(firstValue(value) || '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

export function sendFailure(
  res: NextApiResponse,
  message: string,
  error: unknown
): void {
  console.error('API Route Error:', error)
  res.status(500).json({
    error: message,
    details: error instanceof Error ? error.message : 'Unknown error',
  })
}
