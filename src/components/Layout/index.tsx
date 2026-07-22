import { ReactNode, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Box, Flex, useColorModeValue } from '@chakra-ui/react'
import Sidebar from '../Sidebar'
import Navbar from '../Navbar'
import LoadingPage from '../LoadingPage'
import {
  setConnectState,
  setTmClient,
  setRPCAddress,
} from '@/store/connectSlice'
import { connectWebsocketClient } from '@/rpc/client'
import { rpcManager } from '@/utils/rpcManager'
import { getNetworkLabel } from '@/utils/constant'
import {
  useActiveNetwork,
  useIsNetworkSwitching,
} from '@/hooks/useActiveNetwork'

interface LayoutProps {
  children?: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const dispatch = useDispatch()
  const colorModeValue = useColorModeValue('light-bg', 'dark-bg')
  const activeNetwork = useActiveNetwork()
  const isNetworkSwitching = useIsNetworkSwitching()

  const [isLoading, setIsLoading] = useState(true)

  const connect = async (address: string) => {
    try {
      setIsLoading(true)

      // Get all available endpoints and remove duplicates
      const allEndpoints = [address, ...rpcManager.getEndpoints()]
      const uniqueEndpoints = Array.from(new Set(allEndpoints))

      let lastError = null
      // Try each endpoint
      for (const endpoint of uniqueEndpoints) {
        try {
          const tmClient = await connectWebsocketClient(endpoint)

          if (tmClient) {
            await rpcManager.reportSuccess(endpoint)
            dispatch(setConnectState(true))
            dispatch(setTmClient(tmClient))
            dispatch(setRPCAddress(endpoint))
            setIsLoading(false)
            return
          }
        } catch (endpointError) {
          lastError = endpointError
          await rpcManager.reportFailure(endpoint)

          // Force move to next endpoint by updating RPC manager state
          const nextEndpoint = await rpcManager.reportFailure(endpoint)
          if (nextEndpoint !== endpoint) {
            console.log('Switching to next endpoint:', nextEndpoint)
          }
          continue
        }
      }

      // If we get here, all endpoints failed
      throw lastError || new Error('All connection attempts failed')
    } catch (err) {
      console.error('Connection error:', err)
      dispatch(setConnectState(false))
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoading) {
      const initializeConnection = async () => {
        const endpoint = await rpcManager.getCurrentEndpoint()
        connect(endpoint)
      }
      initializeConnection()
    }
  }, [isLoading])

  if (isLoading) {
    return <LoadingPage />
  }

  return (
    <Box minH="100vh" bg={colorModeValue} position="relative" width="100%">
      <Navbar />
      <Box pt="80px" width="100%">
        <Flex width="100%">
          <Box display={{ base: 'none', md: 'block' }}>
            <Sidebar />
          </Box>
          <Box
            flex={1}
            ml={{ base: 0, md: 60 }}
            p="4"
            width="100%"
            overflowX="auto"
          >
            {isNetworkSwitching ? (
              <LoadingPage
                fullViewport={false}
                message={`Loading ${getNetworkLabel(activeNetwork)} data...`}
              />
            ) : (
              // Remount page content on network change so all mounts re-fetch
              <Box key={activeNetwork}>{children}</Box>
            )}
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}
