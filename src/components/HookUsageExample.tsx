import React from 'react'
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  Button,
} from '@chakra-ui/react'
import { useGraphQLData, useDataWithFallback, useRealTimeData } from '../hooks'
import { GET_BLOCKS, GET_LATEST_BLOCK } from '../graphql/queries/blocks'
import { SUBSCRIBE_TO_NEW_BLOCKS } from '../graphql/subscriptions/blocks'

/**
 * Example component demonstrating the usage of the new custom hooks
 * This shows how components can be updated to use GraphQL as primary source
 * Updated for Apollo Client 3.14.0 compatibility
 */
export function HookUsageExample() {
  return (
    <VStack spacing={6} align="stretch" p={4}>
      <Text fontSize="xl" fontWeight="bold">
        Custom Hooks Usage Examples (Apollo Client 3.14.0)
      </Text>

      {/* Example 1: Basic GraphQL Data Fetching */}
      <Box p={4} border="1px" borderColor="gray.200" borderRadius="md">
        <Text fontWeight="semibold" mb={2}>
          1. Basic GraphQL Data (useGraphQLData)
        </Text>
        <BasicGraphQLExample />
      </Box>

      {/* Example 2: Data with RPC Fallback */}
      <Box p={4} border="1px" borderColor="gray.200" borderRadius="md">
        <Text fontWeight="semibold" mb={2}>
          2. Data with RPC Fallback (useDataWithFallback)
        </Text>
        <FallbackExample />
      </Box>

      {/* Example 3: Real-time Data */}
      <Box p={4} border="1px" borderColor="gray.200" borderRadius="md">
        <Text fontWeight="semibold" mb={2}>
          3. Real-time Data (useRealTimeData)
        </Text>
        <RealTimeExample />
      </Box>
    </VStack>
  )
}

/**
 * Example using useGraphQLData hook
 */
function BasicGraphQLExample() {
  const { data, loading, error, refetch, networkStatus } = useGraphQLData(
    GET_LATEST_BLOCK,
    undefined,
    {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    }
  )

  if (loading) return <Spinner size="sm" />
  if (error) return <Text color="red.500">Error: {error.message}</Text>

  return (
    <VStack align="start" spacing={2}>
      <Text>
        Latest Block Height: {data?.blocks?.[0]?.blockHeight || 'N/A'}
      </Text>
      <Text>Block Hash: {data?.blocks?.[0]?.blockHash?.slice(0, 10)}...</Text>
      <Text>Network Status: {networkStatus}</Text>
      <Badge colorScheme="green">GraphQL Source</Badge>
    </VStack>
  )
}

/**
 * Example using useDataWithFallback hook
 */
function FallbackExample() {
  const { data, loading, error, dataSource, fallbackUsed, isFallbackLoading } =
    useDataWithFallback(
      GET_BLOCKS,
      { limit: 5, offset: 0 },
      {
        enableFallback: true,
        fallbackTimeout: 5000,
      }
    )

  if (loading || isFallbackLoading) return <Spinner size="sm" />
  if (error) return <Text color="red.500">Error: {error.message}</Text>

  return (
    <VStack align="start" spacing={2}>
      <Text>Blocks Count: {data?.blocks?.length || 0}</Text>
      <HStack spacing={2}>
        <Badge colorScheme={dataSource === 'graphql' ? 'green' : 'blue'}>
          {dataSource?.toUpperCase() || 'UNKNOWN'}
        </Badge>
        {fallbackUsed && <Badge colorScheme="orange">Fallback Used</Badge>}
      </HStack>
    </VStack>
  )
}

/**
 * Example using useRealTimeData hook
 */
function RealTimeExample() {
  const {
    isConnected,
    hasErrors,
    healthPercentage,
    subscriptionStatus,
    subscriptionErrors,
    enablePolling,
    disablePolling,
    reconnectSubscriptions,
    clearErrors,
  } = useRealTimeData({
    enableSubscriptions: true,
    enablePollingFallback: true,
    pollingInterval: 30000,
    dataTypes: ['blocks', 'transactions'],
  })

  return (
    <VStack spacing={4}>
      <Text>Real-time data example</Text>
      <Text>Connected: {isConnected ? 'Yes' : 'No'}</Text>
      <Text>Health: {healthPercentage}%</Text>
      <Text>Has Errors: {hasErrors ? 'Yes' : 'No'}</Text>
      {hasErrors && (
        <VStack>
          <Text color="red.500">Subscription Errors:</Text>
          {Object.entries(subscriptionErrors).map(
            ([key, error]) =>
              error && (
                <Text key={key} color="red.500">
                  {key}: {error}
                </Text>
              )
          )}
        </VStack>
      )}
      <HStack>
        <Button onClick={enablePolling} size="sm">
          Enable Polling
        </Button>
        <Button onClick={disablePolling} size="sm">
          Disable Polling
        </Button>
        <Button onClick={reconnectSubscriptions} size="sm">
          Reconnect
        </Button>
        <Button onClick={clearErrors} size="sm">
          Clear Errors
        </Button>
      </HStack>
    </VStack>
  )
}
