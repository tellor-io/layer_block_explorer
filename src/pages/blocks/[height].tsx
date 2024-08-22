import {
  Box,
  Divider,
  HStack,
  Heading,
  Icon,
  Link,
  Table,
  TableContainer,
  Tag,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { FiChevronRight, FiHome } from 'react-icons/fi'
import NextLink from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { getBlock, getBlockResults } from '@/rpc/query'
import { selectTmClient } from '@/store/connectSlice'
import { Block, Coin } from '@cosmjs/stargate'
import { Tx as TxData } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { sha256 } from '@cosmjs/crypto'
import { toHex } from '@cosmjs/encoding'
import { timeFromNow, trimHash, displayDate, getTypeMsg } from '@/utils/helper'
import { decodeData } from '@/utils/decodeHelper' // Import the decoding function
import ErrorBoundary from '../../components/ErrorBoundary'

// Extend the Block type to include rawData
interface ExtendedBlock extends Block {
  rawData?: Uint8Array
}

export default function DetailBlock() {
  const router = useRouter()
  const toast = useToast()
  const { height } = router.query
  const tmClient = useSelector(selectTmClient)
  const [block, setBlock] = useState<ExtendedBlock | null>(null)
  const [blockResults, setBlockResults] = useState<any>(null)

  interface Tx {
    data: TxData
    hash: Uint8Array
  }
  const [txs, setTxs] = useState<Tx[]>([])

  useEffect(() => {
    if (tmClient && height) {
      getBlock(tmClient, parseInt(height as string, 10))
        .then((blockData: Block) => {
          const extendedBlockData = blockData as ExtendedBlock // Type assertion
          console.log('Function called, extendedBlockData:', extendedBlockData)

          try {
            if (extendedBlockData.rawData) {
              console.log(
                'Raw data before decoding:',
                extendedBlockData.rawData
              )
              decodeData(extendedBlockData.rawData)
            } else {
              console.log('No rawData found in extendedBlockData')
            }
          } catch (error) {
            console.error('Error decoding block data:', error)
            console.error('Raw data:', extendedBlockData.rawData) // Log the raw data
          }
          setBlock(extendedBlockData)
        })
        .catch((error) => {
          console.error('Error fetching or decoding block data:', error)
        })

      // Fetch block results
      getBlockResults(
        parseInt(Array.isArray(height) ? height[0] : height)
      ).then((results) => {
        setBlockResults(results)
      })
    }
  }, [tmClient, height])

  useEffect(() => {
    if (block?.txs.length && !txs.length) {
      for (const rawTx of block.txs) {
        console.log('Raw transaction data:', rawTx) // Log the raw transaction data

        try {
          const data = TxData.decode(rawTx)
          const hash = sha256(rawTx)
          setTxs((prevTxs) => [
            ...prevTxs,
            {
              data,
              hash,
            },
          ])
        } catch (error) {
          console.error('Error decoding transaction data:', error)
          console.error('Raw transaction data:', rawTx) // Log the raw transaction data
        }
      }
    }
  }, [block])

  const renderMessages = (messages: any) => {
    if (messages.length == 1) {
      return (
        <HStack>
          <Tag colorScheme="cyan">{getTypeMsg(messages[0].typeUrl)}</Tag>
        </HStack>
      )
    } else if (messages.length > 1) {
      return (
        <HStack>
          <Tag colorScheme="cyan">{getTypeMsg(messages[0].typeUrl)}</Tag>
          <Text textColor="cyan.800">+{messages.length - 1}</Text>
        </HStack>
      )
    }

    return ''
  }

  const getFee = (fees: Coin[] | undefined) => {
    if (fees && fees.length) {
      return (
        <HStack>
          <Text>{fees[0].amount}</Text>
          <Text textColor="cyan.800">{fees[0].denom}</Text>
        </HStack>
      )
    }
    return ''
  }

  const showError = (err: Error) => {
    const errMsg = err.message
    let error = null
    try {
      error = JSON.parse(errMsg)
    } catch (e) {
      error = {
        message: 'Invalid',
        data: errMsg,
      }
    }

    toast({
      title: error.message,
      description: error.data,
      status: 'error',
      duration: 5000,
      isClosable: true,
    })
  }

  return (
    <ErrorBoundary>
      <Head>
        <title>Detail Block | Layer Explorer</title>
        <meta name="description" content="Block | Layer Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Block</Heading>
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
          <Link
            as={NextLink}
            href={'/blocks'}
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}
          >
            <Text color={useColorModeValue('light-theme', 'dark-theme')}>
              Blocks
            </Text>
          </Link>
          <Icon fontSize="16" as={FiChevronRight} />
          <Text>Block #{height}</Text>
        </HStack>
        <Box
          mt={8}
          bg={useColorModeValue('light-container', 'dark-container')}
          shadow={'base'}
          borderRadius={4}
          p={4}
        >
          <Heading size={'md'} mb={4}>
            Header
          </Heading>
          <Divider borderColor={'gray'} mb={4} />
          <TableContainer>
            <Table variant="unstyled" size={'sm'}>
              <Tbody>
                <Tr>
                  <Td pl={0} width={150}>
                    <b>Chain Id</b>
                  </Td>
                  <Td>{block?.header.chainId}</Td>
                </Tr>
                <Tr>
                  <Td pl={0} width={150}>
                    <b>Height</b>
                  </Td>
                  <Td>{block?.header.height}</Td>
                </Tr>
                <Tr>
                  <Td pl={0} width={150}>
                    <b>Block Time</b>
                  </Td>
                  <Td>
                    {block?.header.time
                      ? `${timeFromNow(block?.header.time)} ( ${displayDate(
                          block?.header.time
                        )} )`
                      : ''}
                  </Td>
                </Tr>
                <Tr>
                  <Td pl={0} width={150}>
                    <b>Block Hash</b>
                  </Td>
                  <Td>{block?.id}</Td>
                </Tr>
                <Tr>
                  <Td pl={0} width={150}>
                    <b>Number of Tx</b>
                  </Td>
                  <Td>{block?.txs.length}</Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
        </Box>

        <Box
          mt={8}
          bg={useColorModeValue('light-container', 'dark-container')}
          shadow={'base'}
          borderRadius={4}
          p={4}
        >
          <Heading size={'md'} mb={4}>
            Transactions
          </Heading>
          <Divider borderColor={'gray'} mb={4} />
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Tx Hash</Th>
                  <Th>Messages</Th>
                  <Th>Fee</Th>
                  <Th>Height</Th>
                  <Th>Time</Th>
                </Tr>
              </Thead>
              <Tbody>
                {txs.map((tx) => (
                  <Tr key={toHex(tx.hash)}>
                    <Td>
                      <Link
                        as={NextLink}
                        href={'/txs/' + toHex(tx.hash).toUpperCase()}
                        style={{ textDecoration: 'none' }}
                        _focus={{ boxShadow: 'none' }}
                      >
                        <Text color={'cyan.400'}>{trimHash(tx.hash)}</Text>
                      </Link>
                    </Td>
                    <Td>{renderMessages(tx.data.body?.messages)}</Td>
                    <Td>{getFee(tx.data.authInfo?.fee?.amount)}</Td>
                    <Td>{height}</Td>
                    <Td>
                      {block?.header.time
                        ? timeFromNow(block?.header.time)
                        : ''}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>

        {blockResults && (
          <Box mt={4}>
            <Heading size="md">Block Results</Heading>
            <Text>Height: {blockResults.height}</Text>
            <Text>
              Total Transactions: {blockResults.txs_results?.length || 0}
            </Text>

            {blockResults.txs_results &&
              blockResults.txs_results.length > 0 && (
                <Box mt={2}>
                  <Heading size="sm">Transaction Results</Heading>
                  {blockResults.txs_results.map((tx: any, index: number) => (
                    <Box
                      key={index}
                      mt={2}
                      p={2}
                      borderWidth={1}
                      borderRadius="md"
                    >
                      <Text>Code: {tx.code}</Text>
                      <Text>Gas Wanted: {tx.gas_wanted}</Text>
                      <Text>Gas Used: {tx.gas_used}</Text>
                      {tx.events && tx.events.length > 0 && (
                        <Box mt={1}>
                          <Text fontWeight="bold">Events:</Text>
                          {tx.events.map((event: any, eventIndex: number) => (
                            <Box key={eventIndex} ml={2}>
                              <Text>Type: {event.type}</Text>
                              {event.attributes &&
                                event.attributes.map(
                                  (attr: any, attrIndex: number) => (
                                    <Text key={attrIndex} ml={2}>
                                      {attr.key}: {attr.value}
                                    </Text>
                                  )
                                )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              )}

            {blockResults.finalize_block_events && (
              <Box mt={2}>
                <Heading size="sm">Finalize Block Events</Heading>
                {blockResults.finalize_block_events.map(
                  (event: any, index: number) => (
                    <Box
                      key={index}
                      mt={2}
                      p={2}
                      borderWidth={1}
                      borderRadius="md"
                    >
                      <Text>Type: {event.type}</Text>
                      {event.attributes &&
                        event.attributes.map((attr: any, attrIndex: number) => (
                          <Text key={attrIndex} ml={2}>
                            {attr.key}: {attr.value}
                          </Text>
                        ))}
                    </Box>
                  )
                )}
              </Box>
            )}
          </Box>
        )}
      </main>
    </ErrorBoundary>
  )
}
