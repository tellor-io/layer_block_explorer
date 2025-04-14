import { ReactNode, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Box, Flex, useColorModeValue } from '@chakra-ui/react'
import Sidebar from '../Sidebar'
import Navbar from '../Navbar'
import LoadingPage from '../LoadingPage'
import {
  selectConnectState,
  selectTmClient,
  setConnectState,
  setTmClient,
  setRPCAddress,
} from '@/store/connectSlice'
import { subscribeNewBlock, subscribeTx } from '@/rpc/subscribe'
import {
  setNewBlock,
  selectNewBlock,
  setTxEvent,
  selectTxEvent,
  setSubsNewBlock,
  setSubsTxEvent,
} from '@/store/streamSlice'
import { NewBlockEvent, TxEvent } from '@cosmjs/tendermint-rpc'
import { HARDCODED_RPC_ADDRESS } from '@/utils/constant'
import { connectWebsocketClient } from '@/rpc/client'
import { rpcManager } from '@/utils/rpcManager'
import { toHex } from '@cosmjs/encoding'

interface LayoutProps {
  children?: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const dispatch = useDispatch()
  const colorModeValue = useColorModeValue('light-bg', 'dark-bg')

  const connectState = useSelector(selectConnectState)
  const tmClient = useSelector(selectTmClient)
  const newBlock = useSelector(selectNewBlock)
  const txEvent = useSelector(selectTxEvent)

  const [isLoading, setIsLoading] = useState(true)

  const updateNewBlock = (event: NewBlockEvent): void => {
    dispatch(setNewBlock(event))
  }

  const updateTxEvent = (event: TxEvent): void => {
    console.log('Received transaction event:', {
      hash: toHex(event.hash),
      height: event.height,
      result: event.result
    })
    dispatch(setTxEvent(event))
  }

  const connect = async (address: string) => {
    try {
      setIsLoading(true)

      // Get all available endpoints and remove duplicates
      const allEndpoints = [address, ...rpcManager.getEndpoints()]
      const uniqueEndpoints = Array.from(new Set(allEndpoints))
      console.log('Available endpoints:', uniqueEndpoints)

      let lastError = null
      // Try each endpoint
      for (const endpoint of uniqueEndpoints) {
        try {
          console.log('Attempting connection to:', endpoint)
          const tmClient = await connectWebsocketClient(endpoint)

          if (tmClient) {
            console.log('Successfully connected to:', endpoint)
            await rpcManager.reportSuccess(endpoint)
            dispatch(setConnectState(true))
            dispatch(setTmClient(tmClient))
            dispatch(setRPCAddress(endpoint))
            setIsLoading(false)
            return
          }
        } catch (endpointError) {
          lastError = endpointError
          console.log('Connection failed for:', endpoint, endpointError)
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
    if (tmClient) {
      const subscription = subscribeNewBlock(tmClient, updateNewBlock)
      dispatch(setSubsNewBlock(subscription))
      
      const txSubscription = subscribeTx(tmClient, updateTxEvent)
      dispatch(setSubsTxEvent(txSubscription))
    }
  }, [tmClient, dispatch])

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
          <Box flex={1} ml={{ base: 0, md: 60 }} p="4" width="100%" overflowX="auto">
            {children}
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}
