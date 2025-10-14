import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Alert, AlertIcon, AlertTitle, AlertDescription, Button, VStack } from '@chakra-ui/react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error boundary specifically for GraphQL errors
 * Catches JavaScript errors anywhere in the child component tree
 */
export class GraphQLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
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
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  private handleFallbackToRPC = () => {
    // This could trigger a fallback to RPC data source
    console.log('Falling back to RPC data source...')
    this.setState({ hasError: false, error: null, errorInfo: null })
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
              <AlertTitle>GraphQL Error</AlertTitle>
              <AlertDescription>
                An error occurred while fetching data from the GraphQL indexer. 
                This might be due to network issues or temporary service unavailability.
              </AlertDescription>
              
              <Box>
                <Button size="sm" colorScheme="blue" onClick={this.handleRetry} mr={2}>
                  Retry
                </Button>
                <Button size="sm" variant="outline" onClick={this.handleFallbackToRPC}>
                  Use RPC Fallback
                </Button>
              </Box>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box mt={2} p={2} bg="gray.100" borderRadius="md" fontSize="sm">
                  <strong>Error Details:</strong> {this.state.error.message}
                  {this.state.errorInfo && (
                    <Box mt={1}>
                      <strong>Component Stack:</strong> {this.state.errorInfo.componentStack}
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
