import { useState, useEffect, useCallback } from 'react'
import { useSubscription } from '@apollo/client'
import { SUBSCRIBE_TO_NEW_BLOCKS } from '../graphql/subscriptions/blocks'
import { GraphQLService, GraphQLBlock } from '../services/graphqlService'

interface UseRealTimeBlocksOptions {
  limit?: number
  offset?: number
  enableSubscription?: boolean
}

interface UseRealTimeBlocksReturn {
  blocks: GraphQLBlock[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for real-time block updates
 * Uses existing GraphQL service methods to avoid code duplication
 */
export function useRealTimeBlocks({
  limit = 20,
  offset = 0,
  enableSubscription = true,
}: UseRealTimeBlocksOptions = {}): UseRealTimeBlocksReturn {
  const [blocks, setBlocks] = useState<GraphQLBlock[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial blocks using the existing GraphQL service
  const fetchBlocks = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Use the existing GraphQL service method
      const result = await GraphQLService.getBlocks(limit, offset)
      setBlocks(result)
    } catch (err) {
      console.error('Error fetching blocks:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch blocks')
    } finally {
      setIsLoading(false)
    }
  }, [limit, offset])

  // Initial fetch
  useEffect(() => {
    fetchBlocks()
  }, [fetchBlocks])

  // Subscribe to new blocks in real-time
  const { data: subscriptionData, error: subscriptionError } = useSubscription(
    SUBSCRIBE_TO_NEW_BLOCKS,
    {
      skip: !enableSubscription,
      onError: (error) => {
        console.warn('Block subscription error:', error)
        // Don't set error state for subscription failures, just log them
      },
    }
  )

  // Handle new blocks from subscription
  useEffect(() => {
    if (subscriptionData?.newBlock && enableSubscription) {
      const newBlock = subscriptionData.newBlock
      
      setBlocks((prevBlocks) => {
        // Check if this block already exists
        const exists = prevBlocks.some(
          (block) => block.blockHeight === newBlock.blockHeight
        )

        if (!exists) {
          // Add new block to the beginning and maintain the limit
          return [newBlock, ...prevBlocks.slice(0, limit - 1)]
        }

        return prevBlocks
      })
    }
  }, [subscriptionData, enableSubscription, limit])

  // Handle subscription errors (non-blocking)
  useEffect(() => {
    if (subscriptionError) {
      console.warn('Block subscription error:', subscriptionError)
      // Note: We don't set the error state for subscription failures
      // as they shouldn't break the main functionality
    }
  }, [subscriptionError])

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    await fetchBlocks()
  }, [fetchBlocks])

  return {
    blocks,
    isLoading,
    error,
    refetch,
  }
}
