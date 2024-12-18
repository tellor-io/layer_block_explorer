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
    dispatch(setTxEvent(event))
  }

  const connect = async (address: string) => {
    try {
      const tmClient = await connectWebsocketClient(address)
      if (!tmClient) {
        setIsLoading(false)
        return
      }

      dispatch(setConnectState(true))
      dispatch(setTmClient(tmClient))
      dispatch(setRPCAddress(address))

      setIsLoading(false)
    } catch (err) {
      console.error(err)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (tmClient && !newBlock) {
      const subscription = subscribeNewBlock(tmClient, updateNewBlock)
      dispatch(setSubsNewBlock(subscription))
    }

    if (tmClient && !txEvent) {
      const subscription = subscribeTx(tmClient, updateTxEvent)
      dispatch(setSubsTxEvent(subscription))
    }
  }, [tmClient, newBlock, txEvent, dispatch])

  useEffect(() => {
    if (isLoading) {
      connect(HARDCODED_RPC_ADDRESS)
    }
  }, [isLoading])

  if (isLoading) {
    return <LoadingPage />
  }

  return (
    <Box minH="100vh" bg={colorModeValue}>
      <Navbar />
      <Box pt="64px">
        <Flex>
          <Box display={{ base: 'none', md: 'block' }}>
            <Sidebar />
          </Box>
          <Box flex={1} ml={{ base: 0, md: 60 }} p="4">
            {children}
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}
