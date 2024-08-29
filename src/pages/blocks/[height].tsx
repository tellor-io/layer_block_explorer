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
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  IconButton,
} from '@chakra-ui/react'
import { FiChevronRight, FiHome } from 'react-icons/fi'
import NextLink from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { getBlock, getBlockResults } from '@/rpc/query'
import { getValidatorMoniker } from '@/rpc/query'
import { selectTmClient } from '@/store/connectSlice'
import { Block, Coin } from '@cosmjs/stargate'
import { Tx as TxData } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { sha256 } from '@cosmjs/crypto'
import { toHex } from '@cosmjs/encoding'
import { timeFromNow, trimHash, displayDate, getTypeMsg } from '@/utils/helper'
import { decodeData } from '@/utils/decodeHelper' // Import the decoding function
import ErrorBoundary from '../../components/ErrorBoundary'
import axios from 'axios'
import { Link as ChakraLink } from '@chakra-ui/react'
import { FaExpand, FaCompress } from 'react-icons/fa'

// Extend the Block type to include rawData
interface ExtendedBlock extends Block {
  rawData?: Uint8Array
}

function decodeBase64ToUtf8(base64String: string) {
  return Buffer.from(base64String, 'base64').toString('utf8')
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
  const [decodedTxData, setDecodedTxData] = useState<any>(null)
  const {
    isOpen: isTxOpen,
    onOpen: onTxOpen,
    onClose: onTxClose,
  } = useDisclosure()
  const {
    isOpen: isResultsOpen,
    onOpen: onResultsOpen,
    onClose: onResultsClose,
  } = useDisclosure()
  const [isFullScreen, setIsFullScreen] = useState(false)

  // You might want to use a custom color scheme that matches your navbar
  const buttonColorScheme = 'green' // or whatever color scheme your navbar uses

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

      // Add this code to fetch and decode transaction data
      if (block) {
        axios
          .get(
            `http://tellorlayer.com:26657/block?height=${block.header.height}`
          )
          .then((response) => {
            const txData = response.data.result.block.data.txs[0]
            if (txData) {
              const decodedData = JSON.parse(decodeBase64ToUtf8(txData))
              setDecodedTxData(decodedData)
            }
          })
          .catch((error) =>
            console.error('Error fetching transaction data:', error)
          )
      }
    }
  }, [tmClient, height, block])

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

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
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
                {decodedTxData && (
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Vote Ext Tx</b>
                    </Td>
                    <Td>
                      <Button
                        onClick={onTxOpen}
                        colorScheme={buttonColorScheme}
                        size="sm"
                      >
                        View Vote Extension Transaction
                      </Button>
                    </Td>
                  </Tr>
                )}
                {blockResults && (
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Block Results</b>
                    </Td>
                    <Td>
                      <Button
                        onClick={onResultsOpen}
                        colorScheme={buttonColorScheme}
                        size="sm"
                      >
                        View Block Results
                      </Button>
                    </Td>
                  </Tr>
                )}
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
      </main>

      <Modal
        isOpen={isTxOpen}
        onClose={onTxClose}
        size={isFullScreen ? 'full' : 'xl'}
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Decoded Transaction Data for Block {block?.header.height}
            <IconButton
              icon={isFullScreen ? <FaCompress /> : <FaExpand />}
              aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
              onClick={toggleFullScreen}
              size="sm"
              ml={2}
              position="absolute"
              right="40px"
              top="10px"
            />
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box
              bg={useColorModeValue('gray.50', 'gray.900')}
              p={4}
              borderRadius="md"
              overflowX="auto"
              height={isFullScreen ? 'calc(100vh - 150px)' : 'auto'}
            >
              <pre>{JSON.stringify(decodedTxData, null, 2)}</pre>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme={buttonColorScheme} mr={3} onClick={onTxClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isResultsOpen}
        onClose={onResultsClose}
        size={isFullScreen ? 'full' : 'xl'}
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Block Results for Block {block?.header.height}
            <IconButton
              icon={isFullScreen ? <FaCompress /> : <FaExpand />}
              aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
              onClick={toggleFullScreen}
              size="sm"
              ml={2}
              position="absolute"
              right="40px"
              top="10px"
            />
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box
              bg={useColorModeValue('gray.50', 'gray.900')}
              p={4}
              borderRadius="md"
              overflowX="auto"
              height={isFullScreen ? 'calc(100vh - 150px)' : 'auto'}
            >
              <pre>{JSON.stringify(blockResults, null, 2)}</pre>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme={buttonColorScheme}
              mr={3}
              onClick={onResultsClose}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ErrorBoundary>
  )
}
