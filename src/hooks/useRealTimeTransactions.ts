import { useState, useEffect, useCallback } from 'react'
import { useSubscription } from '@apollo/client'
import { SUBSCRIBE_TO_NEW_TRANSACTIONS } from '../graphql/subscriptions/transactions'
import { GraphQLService, GraphQLTransaction } from '../services/graphqlService'

interface UseRealTimeTransactionsOptions {
  limit?: number
  offset?: number
  enableSubscription?: boolean
  blockHeight?: number
}

interface UseRealTimeTransactionsReturn {
  transactions: GraphQLTransaction[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for real-time transaction updates
 * Uses existing GraphQL service methods to avoid code duplication
 */
export function useRealTimeTransactions({
  limit = 20,
  offset = 0,
  enableSubscription = true,
  blockHeight,
}: UseRealTimeTransactionsOptions = {}): UseRealTimeTransactionsReturn {
  const [transactions, setTransactions] = useState<GraphQLTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial transactions using the existing GraphQL service
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use the existing GraphQL service method
      const result = await GraphQLService.getTransactions(limit, offset)
      setTransactions(result)
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch transactions'
      )
    } finally {
      setIsLoading(false)
    }
  }, [limit, offset])

  // Initial fetch
  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Subscribe to new transactions in real-time
  const { data: subscriptionData, error: subscriptionError } = useSubscription(
    SUBSCRIBE_TO_NEW_TRANSACTIONS,
    {
      skip: !enableSubscription,
      onError: (error) => {
        console.warn('Transaction subscription error:', error)
        // Don't set error state for subscription failures, just log them
      },
    }
  )

  // Handle new transactions from subscription
  useEffect(() => {
    if (subscriptionData?.transactions && enableSubscription) {
      const transactionPayload = subscriptionData.transactions

      // Only process if it's a new transaction (mutation_type: 'INSERT')
      if (
        transactionPayload.mutation_type === 'INSERT' &&
        transactionPayload._entity
      ) {
        const newTransaction = transactionPayload._entity

        // If blockHeight filter is specified, only add transactions from that block
        if (blockHeight && newTransaction.blockHeight !== blockHeight) {
          return
        }

        setTransactions((prevTransactions) => {
          // Check if this transaction already exists
          const exists = prevTransactions.some(
            (tx) => tx.id === newTransaction.id
          )

          if (!exists) {
            // Add new transaction to the beginning and maintain the limit
            return [newTransaction, ...prevTransactions.slice(0, limit - 1)]
          }

          return prevTransactions
        })
      }
    }
  }, [subscriptionData, enableSubscription, limit, blockHeight])

  // Handle subscription errors (non-blocking)
  useEffect(() => {
    if (subscriptionError) {
      console.warn('Transaction subscription error:', subscriptionError)
      // Note: We don't set the error state for subscription failures
      // as they shouldn't break the main functionality
    }
  }, [subscriptionError])

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    await fetchTransactions()
  }, [fetchTransactions])

  return {
    transactions,
    isLoading,
    error,
    refetch,
  }
}
