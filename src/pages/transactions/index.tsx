import Head from 'next/head'
import {
  Box,
  Divider,
  HStack,
  Heading,
  Icon,
  Link,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  Tag,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import NextLink from 'next/link'
import { FiChevronRight, FiHome } from 'react-icons/fi'
import { selectTmClient } from '@/store/connectSlice'
import { selectNewBlock } from '@/store/streamSlice'
import { TxEvent } from '@cosmjs/tendermint-rpc'
import { timeFromNow, trimHash, getTypeMsg } from '@/utils/helper'
import { toHex, fromBase64 } from '@cosmjs/encoding'
import { TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx'

const MAX_ROWS = 50

interface Tx {
  TxEvent: TxEvent
  Timestamp: Date
}

export default function Transactions() {
  const [txs, setTxs] = useState<Tx[]>([])
  const tmClient = useSelector(selectTmClient)
  const newBlock = useSelector(selectNewBlock)
  const containerBg = useColorModeValue('light-container', 'dark-container')
  const txHashColor = useColorModeValue('light-theme', 'dark-theme')

  const updateTxs = (txEvent: TxEvent) => {
    const tx = {
      TxEvent: txEvent,
      Timestamp: new Date(),
    }

    if (txs.length) {
      const exists = txs.some(
        (existingTx) =>
          existingTx.TxEvent.hash === txEvent.hash &&
          existingTx.Timestamp.getTime() === tx.Timestamp.getTime()
      )

      if (!exists && txEvent.height >= txs[0].TxEvent.height) {
        setTxs((prevTx) => [tx, ...prevTx.slice(0, MAX_ROWS - 1)])
      }
    } else {
      setTxs([tx])
    }
  }

  const renderMessages = (data: any) => {
    try {
      if (!data) {
        console.warn('No transaction data found')
        return null
      }

      console.log('Processing transaction data:', data)

      // Decode the transaction data
      let decodedTx
      try {
        decodedTx = TxBody.decode(data)
        console.log('Successfully decoded transaction:', decodedTx)
        return decodedTx.messages.map((msg: any, index: number) => (
          <Text key={index}>{msg.typeUrl}</Text>
        ))
      } catch (decodeError) {
        console.error('Failed to decode transaction:', decodeError)
        return 'Error decoding transaction'
      }
    } catch (error) {
      console.error('Error rendering message:', error)
      return null
    }
  }

  useEffect(() => {
    if (newBlock?.txs?.length) {
      console.log('New block transactions:', newBlock.txs)
      for (const tx of newBlock.txs) {
      }
    }
  }, [newBlock])

  return (
    <>
      <Head>
        <title>Transactions | Layer Explorer</title>
        <meta name="description" content="Transactions | Layer Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Transactions</Heading>
          <Divider borderColor={'gray'} size="10px" orientation="vertical" />
          <Link
            as={NextLink}
            href={'/'}
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}
            display="flex"
            justifyContent="center"
          >
            <Icon
              fontSize="16"
              color={useColorModeValue('light-theme', 'dark-theme')}
              as={FiHome}
            />
          </Link>
          <Icon fontSize="16" as={FiChevronRight} />
          <Text>Transactions</Text>
        </HStack>

        <Box
          mt={8}
          bg={containerBg}
          shadow={'base'}
          borderRadius={4}
          p={4}
          overflowX="auto"
        >
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Tx Hash</Th>
                  <Th>Height</Th>
                  <Th>Messages</Th>
                  <Th>Time</Th>
                </Tr>
              </Thead>
              <Tbody>
                {txs.map((tx) => (
                  <Tr key={toHex(tx.TxEvent.hash)}>
                    <Td>
                      <Link
                        as={NextLink}
                        href={'/txs/' + toHex(tx.TxEvent.hash).toUpperCase()}
                        style={{ textDecoration: 'none' }}
                        _focus={{ boxShadow: 'none' }}
                      >
                        <Text color={txHashColor}>
                          {trimHash(tx.TxEvent.hash)}
                        </Text>
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        as={NextLink}
                        href={'/blocks/' + tx.TxEvent.height}
                        style={{ textDecoration: 'none' }}
                        _focus={{ boxShadow: 'none' }}
                      >
                        <Text color={txHashColor}>{tx.TxEvent.height}</Text>
                      </Link>
                    </Td>
                    <Td>{renderMessages(tx.TxEvent.result.data)}</Td>
                    <Td>{timeFromNow(tx.Timestamp.toISOString())}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      </main>
    </>
  )
}
