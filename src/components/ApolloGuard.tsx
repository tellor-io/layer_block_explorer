import { ReactNode } from 'react'
import { useApolloContext } from '@/pages/_app'
import {
  Box,
  VStack,
  Spinner,
  Text,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react'

interface ApolloGuardProps {
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean
  showRetryInfo?: boolean
}

/**
 * ApolloGuard component that conditionally renders children based on Apollo Client state
 * Provides loading states and error handling for GraphQL-dependent components
 */
export function ApolloGuard({ children, fallback, showError = true, showRetryInfo = true }: ApolloGuardProps) {
  const { 
    client: apolloClient, 
    isInitialized, 
    isInitializing, 
    error: apolloError, 
    retryCount, 
    lastError 
  } = useApolloContext()

  // Show loading state while Apollo Client is initializing
  if (isInitializing) {
    return (
      <VStack spacing={4} py={8}>
        <Spinner size="lg" />
        <Text>Initializing GraphQL connection...</Text>
        {showRetryInfo && retryCount > 0 && (
          <Text fontSize="sm" color="gray.500">
            Attempt {retryCount} of 3
          </Text>
        )}
      </VStack>
    )
  }

  // Show error state if Apollo Client failed to initialize
  if (apolloError && showError) {
    return (
      <Alert status="warning">
        <AlertIcon />
        <AlertDescription>
          <VStack align="start" spacing={2}>
            <Text fontWeight="bold">GraphQL connection unavailable</Text>
            <Text fontSize="sm">The application is running in RPC-only mode. Some advanced features may be limited, but core functionality remains available.</Text>
            {showRetryInfo && retryCount > 0 && (
              <Text fontSize="xs" color="gray.600">
                GraphQL failed after {retryCount} attempts. Using RPC fallback.
              </Text>
            )}
          </VStack>
        </AlertDescription>
      </Alert>
    )
  }

  // Show fallback if Apollo Client is not available
  if (!apolloClient) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <Alert status="info">
        <AlertIcon />
        <AlertDescription>
          <VStack align="start" spacing={2}>
            <Text fontWeight="bold">Using RPC data sources</Text>
            <Text fontSize="sm">
              The application is running with RPC data sources. All core functionality is available.
            </Text>
            {showRetryInfo && retryCount > 0 && (
              <Text fontSize="xs" color="gray.600">
                GraphQL unavailable after {retryCount} attempts. RPC mode active.
              </Text>
            )}
          </VStack>
        </AlertDescription>
      </Alert>
    )
  }

  // Render children if Apollo Client is ready
  return <>{children}</>
}

export default ApolloGuard
