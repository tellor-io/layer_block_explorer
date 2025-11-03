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
/* MIGRATED TO GRAPHQL - Commented out RPC subscription imports
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
*/
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
  /* MIGRATED TO GRAPHQL - Commented out RPC subscription state
  const newBlock = useSelector(selectNewBlock)
  const txEvent = useSelector(selectTxEvent)
  const subsNewBlock = useSelector(selectSubsNewBlock)
  const subsTxEvent = useSelector(selectSubsTxEvent)
  */

  const [isLoading, setIsLoading] = useState(true)

  /* MIGRATED TO GRAPHQL - Commented out RPC subscription callbacks
  const updateNewBlock = (event: NewBlockEvent): void => {
    dispatch(setNewBlock(event))
  }

  const updateTxEvent = (event: TxEvent): void => {
    dispatch(setTxEvent(event))
  }
  */

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

  /* MIGRATED TO GRAPHQL - Commented out RPC subscription setup
   * 
   * Previous behavior: Created RPC subscriptions for new blocks and transactions
   * - subscribeNewBlock: Polled every 1 second for new blocks
   * - subscribeTx: Polled every 2 seconds for new transactions
   * - These subscriptions were never cleaned up, causing continuous RPC calls
   * 
   * New behavior: Each page component now uses GraphQL queries directly
   * - Home page: Uses GraphQL polling for latest block (GET_SINGLE_LATEST_BLOCK)
   * - Navbar: Uses GraphQL polling for latest block height
   * - Blocks page: Uses GraphQL polling for block list
   * - Data Feed page: Uses GraphQL polling for aggregate reports
   * 
   * This eliminates unnecessary RPC calls and improves performance.
   * 
   * Migration Date: 2025-11-03
   * Migration Plan: See GRAPHQL_MIGRATION_PLAN.md
   */
  /*
  useEffect(() => {
    if (tmClient) {
      // Clean up any existing subscriptions before creating new ones
      if (subsNewBlock) {
        subsNewBlock.unsubscribe()
      }
      if (subsTxEvent) {
        subsTxEvent.unsubscribe()
      }

      const subscription = subscribeNewBlock(tmClient, updateNewBlock)
      dispatch(setSubsNewBlock(subscription))

      const txSubscription = subscribeTx(tmClient, updateTxEvent)
      dispatch(setSubsTxEvent(txSubscription))

      // Cleanup function to unsubscribe when component unmounts or tmClient changes
      return () => {
        if (subscription) {
          subscription.unsubscribe()
        }
        if (txSubscription) {
          txSubscription.unsubscribe()
        }
      }
    }
  }, [tmClient, dispatch, subsNewBlock, subsTxEvent])
  */

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
            {children}
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}
