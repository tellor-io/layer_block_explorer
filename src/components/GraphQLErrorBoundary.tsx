import React, { Component, ErrorInfo, ReactNode } from 'react'
import {
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  VStack,
  Progress,
  Text,
  HStack,
  Badge,
} from '@chakra-ui/react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  maxRetries?: number
  retryDelay?: number
  enableAutoRetry?: boolean
  onRetry?: () => void
  onFallback?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRetrying: boolean
  retryDelay: number
  lastRetryTime: number
}

/**
 * Error boundary specifically for GraphQL errors
 * Catches JavaScript errors anywhere in the child component tree
 */
export class GraphQLErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      retryDelay: props.retryDelay || 1000,
      lastRetryTime: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('GraphQL Error Boundary caught an error:', error, errorInfo)

    // Update state with error info
    this.setState({ errorInfo })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Auto-retry if enabled
    if (
      this.props.enableAutoRetry &&
      this.state.retryCount < (this.props.maxRetries || 3)
    ) {
      this.scheduleRetry()
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  private scheduleRetry = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }

    const delay = Math.min(
      this.state.retryDelay * Math.pow(2, this.state.retryCount),
      30000
    ) // Max 30 seconds

    this.retryTimeout = setTimeout(() => {
      this.handleRetry()
    }, delay)
  }

  private handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: true,
      lastRetryTime: Date.now(),
    }))

    // Call custom retry handler if provided
    this.props.onRetry?.()

    // Reset retrying state after a short delay
    setTimeout(() => {
      this.setState({ isRetrying: false })
    }, 1000)
  }

  private handleFallbackToRPC = () => {
    // This could trigger a fallback to RPC data source
    console.log('Falling back to RPC data source...')
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    })

    // Call custom fallback handler if provided
    this.props.onFallback?.()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Box p={4} maxW="600px" mx="auto">
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={3} flex={1}>
              <HStack justify="space-between" w="full">
                <AlertTitle>GraphQL Error</AlertTitle>
                <HStack spacing={2}>
                  <Badge colorScheme="red" variant="subtle">
                    Attempt {this.state.retryCount + 1}
                  </Badge>
                  {this.state.isRetrying && (
                    <Badge colorScheme="blue" variant="subtle">
                      Retrying...
                    </Badge>
                  )}
                </HStack>
              </HStack>

              <AlertDescription>
                An error occurred while fetching data from the GraphQL indexer.
                This might be due to network issues or temporary service
                unavailability.
              </AlertDescription>

              {this.state.isRetrying && (
                <Box w="full">
                  <Text fontSize="sm" mb={2}>
                    Retrying in progress...
                  </Text>
                  <Progress size="sm" isIndeterminate colorScheme="blue" />
                </Box>
              )}

              <Box>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={this.handleRetry}
                  mr={2}
                  isLoading={this.state.isRetrying}
                  loadingText="Retrying"
                  isDisabled={
                    this.state.retryCount >= (this.props.maxRetries || 3)
                  }
                >
                  Retry ({this.state.retryCount + 1}/
                  {this.props.maxRetries || 3})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={this.handleFallbackToRPC}
                >
                  Use RPC Fallback
                </Button>
              </Box>

              {this.state.lastRetryTime > 0 && (
                <Text fontSize="xs" color="gray.500">
                  Last retry:{' '}
                  {new Date(this.state.lastRetryTime).toLocaleTimeString()}
                </Text>
              )}

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box mt={2} p={2} bg="gray.100" borderRadius="md" fontSize="sm">
                  <strong>Error Details:</strong> {this.state.error.message}
                  {this.state.errorInfo && (
                    <Box mt={1}>
                      <strong>Component Stack:</strong>{' '}
                      {this.state.errorInfo.componentStack}
                    </Box>
                  )}
                </Box>
              )}
            </VStack>
          </Alert>
        </Box>
      )
    }

    return this.props.children
  }
}
