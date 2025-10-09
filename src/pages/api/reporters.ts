import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'
import { rpcManager } from '../../utils/rpcManager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const {
      endpoint: customEndpoint,
      rpc,
      sortBy,
      sortOrder,
      page,
      perPage,
    } = req.query

    // Use custom endpoint if provided, otherwise use RPC address from query, otherwise use rpcManager
    let endpoint: string
    if (customEndpoint) {
      endpoint = customEndpoint as string
    } else if (rpc) {
      endpoint = rpc as string
    } else {
      endpoint = await rpcManager.getCurrentEndpoint()
    }

    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await fetch(
      `${baseEndpoint}/tellor-io/layer/reporter/reporters`
    )

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Apply sorting if requested
    if (sortBy && data.reporters) {
      const sortField = sortBy as string
      const order = sortOrder === 'desc' ? -1 : 1

      data.reporters.sort((a: any, b: any) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        // Handle nested properties
        if (sortField === 'displayName') {
          // For displayName sorting, we need to sort by the actual display name
          // Since displayName is derived client-side, we'll sort by address as a fallback
          // The client-side will handle proper alphabetical sorting
          aValue = a.address
          bValue = b.address
        } else if (sortField === 'power') {
          aValue = parseInt(a.power || '0')
          bValue = parseInt(b.power || '0')
        } else if (sortField === 'min_tokens_required') {
          aValue = parseInt(a.metadata?.min_tokens_required || '0')
          bValue = parseInt(b.metadata?.min_tokens_required || '0')
        } else if (sortField === 'commission_rate') {
          aValue = parseFloat(a.metadata?.commission_rate || '0')
          bValue = parseFloat(b.metadata?.commission_rate || '0')
        } else if (sortField === 'jailed') {
          aValue = a.metadata?.jailed ? 'Yes' : 'No'
          bValue = b.metadata?.jailed ? 'Yes' : 'No'
        } else if (sortField === 'selectors') {
          // Note: selectors is calculated client-side, so we can't sort by it server-side
          // This will be handled by client-side sorting
          return 0
        }

        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue) * order
        }

        // Handle numeric comparison
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * order
        }

        return 0
      })
    }

    // Apply pagination if requested
    if (page && perPage && data.reporters) {
      const pageNum = parseInt(page as string)
      const perPageNum = parseInt(perPage as string)
      const start = pageNum * perPageNum
      const end = start + perPageNum

      data.reporters = data.reporters.slice(start, end)
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({
      error: 'Failed to fetch reporters',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export const getReporters = async (endpoint: string) => {
  try {
    const response = await axios.get('/api/reporters', {
      params: { endpoint },
    })
    return response.data
  } catch (error) {
    console.error('Failed to fetch reporters:', error)
    throw error
  }
}
