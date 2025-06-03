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
  useClipboard,
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
import axios from 'axios'
import { FaExpand, FaCompress, FaCopy } from 'react-icons/fa'
import { rpcManager } from '@/utils/rpcManager'

// Extend the Block type to include rawData
interface ExtendedBlock extends Block {
  rawData?: Uint8Array
}

function decodeBase64ToUtf8(base64String: string) {
  return Buffer.from(base64String, 'base64').toString('utf8')
}

// Add this function at the top of your file, after the imports
const serializeBigInt = (data: any): any => {
  if (typeof data === 'bigint') {
    return data.toString()
  } else if (Array.isArray(data)) {
    return data.map(serializeBigInt)
  } else if (typeof data === 'object' && data !== null) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, serializeBigInt(value)])
    )
  }
  return data
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
  const { onCopy: onCopyTx, hasCopied: hasCopiedTx } = useClipboard(
    JSON.stringify(decodedTxData, null, 2)
  )
  const { onCopy: onCopyResults, hasCopied: hasCopiedResults } = useClipboard(
    blockResults ? JSON.stringify(serializeBigInt(blockResults), null, 2) : ''
  )

  const handleCopy = (copyFunction: () => void, content: string) => {
    copyFunction()
    toast({
      title: 'Copied!',
      description: content,
      status: 'success',
      duration: 2000,
      isClosable: true,
      position: 'top',
    })
  }

  useEffect(() => {
    if (tmClient && height) {
      getBlock(tmClient, parseInt(height as string, 10))
        .then(async (blockData: Block) => {
          const extendedBlockData = blockData as ExtendedBlock
          setBlock(extendedBlockData)

          // Remove the axios call that's failing and instead look for vote extensions
          // in block results if that's where they are stored
        })
        .catch((error) => {
          console.error('Error fetching or decoding block data:', error)
        })

      // Fetch block results
      getBlockResults(parseInt(Array.isArray(height) ? height[0] : height))
        .then((results) => {
          setBlockResults(results)
          // If vote extensions are in the block results, decode them here
          if (results?.vote_extensions) {
            try {
              const decodedExtensions = JSON.parse(JSON.stringify(results.vote_extensions))
              setDecodedTxData(decodedExtensions)
            } catch (error) {
              console.error('Error decoding vote extensions:', error)
            }
          }
        })
        .catch((error) => {
          console.error('Error fetching block results:', error)
        })
    }
  }, [tmClient, height])

  useEffect(() => {
    if (block?.txs.length && !txs.length) {
      for (const rawTx of block.txs) {
        try {
          // Try to decode as JSON first
          const textDecoder = new TextDecoder();
          const jsonString = textDecoder.decode(rawTx);
          
          // Check if this looks like a vote extension (has block_height field)
          if (jsonString.includes('"block_height"')) {
            const jsonData = JSON.parse(jsonString);
            setDecodedTxData(jsonData);
          } else {
            // Only try transaction decoding if it's not a vote extension
            const data = TxData.decode(rawTx);
            const hash = sha256(rawTx);
            setTxs((prevTxs) => [
              ...prevTxs,
              {
                data,
                hash,
              },
            ]);
          }
        } catch (error) {
          console.error('Error decoding data:', error);
        }
      }
    }
  }, [block])

  useEffect(() => {}, [blockResults])

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
        <title>Detail Block | Tellor Explorer</title>
        <meta name="description" content="Block | Tellor Explorer" />
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
                      <Button onClick={onTxOpen} size="sm">
                        View Vote Extension Transaction
                      </Button>
                    </Td>
                  </Tr>
                )}
                {blockResults !== null && (
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Block Results</b>
                    </Td>
                    <Td>
                      <Button onClick={onResultsOpen} size="sm">
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
              position="relative"
            >
              <IconButton
                icon={<FaCopy />}
                aria-label="Copy to clipboard"
                onClick={() =>
                  handleCopy(onCopyTx, 'Transaction data copied to clipboard')
                }
                position="absolute"
                top={2}
                right={2}
                size="sm"
              />
              <pre>{JSON.stringify(decodedTxData, null, 2)}</pre>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onTxClose}>
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
              position="relative"
            >
              <IconButton
                icon={<FaCopy />}
                aria-label="Copy to clipboard"
                onClick={() =>
                  handleCopy(onCopyResults, 'Block results copied to clipboard')
                }
                position="absolute"
                top={2}
                right={2}
                size="sm"
              />
              <pre>
                {blockResults
                  ? JSON.stringify(serializeBigInt(blockResults), null, 2)
                  : ''}
              </pre>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onResultsClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ErrorBoundary>
  )
}
