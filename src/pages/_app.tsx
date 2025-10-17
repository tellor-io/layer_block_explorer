import '@/styles/globals.css'
import '../styles/fonts.css?v=1'
import type { AppProps } from 'next/app'
import { ChakraProvider, useColorModeValue } from '@chakra-ui/react'
import Layout from '@/components/Layout'
import theme, { ppNeueMontreal } from '@/theme'
import { wrapper } from '@/store'
import { Provider } from 'react-redux'
import { ReactNode, useEffect, useState, createContext, useContext } from 'react'
import { ApolloProvider, ApolloClient } from '@apollo/client'
import { createApolloClient } from '@/utils/graphqlClient'
// import '@/utils/apolloDevMessages' // Temporarily disabled to debug Apollo Client issues

// Create Apollo Client context
interface ApolloContextType {
  client: ApolloClient | null
  isInitialized: boolean
  isInitializing: boolean
  error: string | null
  retryCount: number
  lastError: Error | null
}

const ApolloContext = createContext<ApolloContextType>({
  client: null,
  isInitialized: false,
  isInitializing: true,
  error: null,
  retryCount: 0,
  lastError: null,
})

export const useApolloContext = () => useContext(ApolloContext)

function App({
  Component,
  pageProps,
}: AppProps & { Component: { children?: ReactNode } }) {
  const { store, props } = wrapper.useWrappedStore(pageProps)
  const [apolloClient, setApolloClient] = useState<ApolloClient | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(typeof window !== 'undefined')
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState<Error | null>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    const MAX_RETRIES = 3
    const RETRY_DELAY = 2000 // 2 seconds
    const TIMEOUT_DURATION = 15000 // 15 seconds

    // Prevent multiple initialization
    if (apolloClient || isInitialized) {
      console.log('[Apollo] Client already initialized, skipping...')
      return
    }

    const initializeApollo = async (attempt: number = 1) => {
      try {
        console.log(`[Apollo] Initializing Apollo Client (attempt ${attempt}/${MAX_RETRIES})...`)
        setIsInitializing(true)
        setError(null)
        setLastError(null)
        
        // Add health check before creating client
        console.log('[Apollo] Performing health check...')
        const client = await createApolloClient()
        
        // Verify client is properly initialized
        if (!client) {
          throw new Error('Apollo Client creation returned null')
        }
        
        console.log('[Apollo] Apollo Client initialized successfully:', {
          client: !!client,
          cache: !!client.cache,
          link: !!client.link
        })
        
        setApolloClient(client)
        setIsInitialized(true)
        setIsInitializing(false)
        setRetryCount(0)
        setLastError(null)
        
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Unknown error')
        console.error(`[Apollo] Failed to initialize Apollo Client (attempt ${attempt}):`, {
          message: errorObj.message,
          stack: errorObj.stack,
          name: errorObj.name,
          attempt,
          maxRetries: MAX_RETRIES
        })
        
        setLastError(errorObj)
        setRetryCount(attempt)
        
        // Retry logic
        if (attempt < MAX_RETRIES) {
          console.log(`[Apollo] Retrying in ${RETRY_DELAY}ms...`)
          setTimeout(() => {
            initializeApollo(attempt + 1)
          }, RETRY_DELAY * attempt) // Exponential backoff
        } else {
          console.error('[Apollo] Max retries reached, proceeding in RPC-only mode')
          const errorMessage = `GraphQL connection failed after ${MAX_RETRIES} attempts. The application will continue using RPC data sources.`
          setError(errorMessage)
          setApolloClient(null)
          setIsInitialized(true)
          setIsInitializing(false)
        }
      }
    }

    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isInitializing) {
        console.warn('[Apollo] Apollo Client initialization timeout, proceeding in RPC-only mode')
        setError('GraphQL connection timeout. The application will continue using RPC data sources.')
        setApolloClient(null)
        setIsInitialized(true)
        setIsInitializing(false)
      }
    }, TIMEOUT_DURATION)

    initializeApollo()

    return () => {
      clearTimeout(timeout)
      // Cleanup Apollo Client if it exists
      if (apolloClient) {
        console.log('[Apollo] Cleaning up Apollo Client...')
        try {
          (apolloClient as any).stop?.()
        } catch (error) {
          console.warn('[Apollo] Error stopping client:', error)
        }
      }
    }
  }, []) // Empty dependency array to run only once

  const apolloContextValue = {
    client: apolloClient,
    isInitialized,
    isInitializing,
    error,
    retryCount,
    lastError,
  }

  // During SSR, don't show loading state
  if (typeof window === 'undefined') {
    return (
      <ChakraProvider theme={theme}>
        <Provider store={store}>
          <ApolloContext.Provider value={apolloContextValue}>
            <main
              className={ppNeueMontreal.variable}
              style={{
                fontFamily: 'var(--font-pp-neue-montreal), sans-serif',
                backgroundColor: useColorModeValue(
                  'var(--chakra-colors-page-bg-light)',
                  'var(--chakra-colors-page-bg-dark)'
                ),
                minHeight: '100vh',
                width: '100%',
                position: 'relative',
                overflowX: 'hidden',
              }}
            >
              <Layout>
                <Component {...props} />
              </Layout>
            </main>
          </ApolloContext.Provider>
        </Provider>
      </ChakraProvider>
    )
  }

  if (isInitializing) {
    return (
      <ChakraProvider theme={theme}>
        <ApolloContext.Provider value={apolloContextValue}>
          <main
            className={ppNeueMontreal.variable}
            style={{
              fontFamily: 'var(--font-pp-neue-montreal), sans-serif',
              backgroundColor: useColorModeValue(
                'var(--chakra-colors-page-bg-light)',
                'var(--chakra-colors-page-bg-dark)'
              ),
              minHeight: '100vh',
              width: '100%',
              position: 'relative',
              overflowX: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '1rem' }}>Loading...</div>
                <div>Connecting to Tellor Layer Block Explorer...</div>
                {retryCount > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                    Attempt {retryCount} of 3
                  </div>
                )}
              </div>
            </div>
          </main>
        </ApolloContext.Provider>
      </ChakraProvider>
    )
  }

  return (
    <ChakraProvider theme={theme}>
      <Provider store={store}>
        <ApolloContext.Provider value={apolloContextValue}>
          {apolloClient ? (
            <ApolloProvider client={apolloClient}>
              <main
                className={ppNeueMontreal.variable}
                style={{
                  fontFamily: 'var(--font-pp-neue-montreal), sans-serif',
                  backgroundColor: useColorModeValue(
                    'var(--chakra-colors-page-bg-light)',
                    'var(--chakra-colors-page-bg-dark)'
                  ),
                  minHeight: '100vh',
                  width: '100%',
                  position: 'relative',
                  overflowX: 'hidden',
                }}
              >
                <Layout>
                  <Component {...props} />
                </Layout>
              </main>
            </ApolloProvider>
          ) : (
            <main
              className={ppNeueMontreal.variable}
              style={{
                fontFamily: 'var(--font-pp-neue-montreal), sans-serif',
                backgroundColor: useColorModeValue(
                  'var(--chakra-colors-page-bg-light)',
                  'var(--chakra-colors-page-bg-dark)'
                ),
                minHeight: '100vh',
                width: '100%',
                position: 'relative',
                overflowX: 'hidden',
              }}
            >
              <Layout>
                <Component {...props} />
              </Layout>
            </main>
          )}
        </ApolloContext.Provider>
      </Provider>
    </ChakraProvider>
  )
}

export default App
