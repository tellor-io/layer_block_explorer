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
import axios from 'axios'
import { toHex } from '@cosmjs/encoding'
import { timeFromNow, trimHash, displayDate, getTypeMsg, bytesToBech32ConsensusAddress } from '@/utils/helper'
import { sha256 } from '@cosmjs/crypto'
import ErrorBoundary from '../../components/ErrorBoundary'
import { FaExpand, FaCompress, FaCopy } from 'react-icons/fa'
// GraphQL imports
import { graphqlQuery, bytesToHex, parseJsonField } from '@/datasources/graphql/client'
import { GET_BLOCK_BY_HEIGHT, GET_VALIDATORS, GET_TRANSACTIONS_BY_BLOCK_HEIGHT } from '@/datasources/graphql/queries'
import { BlockResponse, ValidatorsResponse, ValidatorDescription, TransactionsResponse, Transaction } from '@/datasources/graphql/types'
import { getBlockResults } from '@/rpc/query'
import { Tx as TxData } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin'
import { fromBase64 } from '@cosmjs/encoding'


// GraphQL interfaces
interface GraphQLBlock {
  blockHeight: string
  blockHash: string
  blockTime: string
  proposerAddress: string
  numberOfTx: number
  appHash: string
  chainId: string
  voteExtensions?: string
  consensusHash?: string
  dataHash?: string
  evidenceHash?: string
  nextValidatorsHash?: string
  validatorsHash?: string
}

interface ValidatorMap {
  [key: string]: string
}

export default function DetailBlock() {
  const router = useRouter()
  const toast = useToast()
  const { height } = router.query
  const [block, setBlock] = useState<GraphQLBlock | null>(null)
  const [validatorMap, setValidatorMap] = useState<ValidatorMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [blockResults, setBlockResults] = useState<any>(null)
  const [voteExtensionData, setVoteExtensionData] = useState<any>(null)
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
    voteExtensionData ? JSON.stringify(voteExtensionData, null, 2) : ''
  )
  const { onCopy: onCopyResults, hasCopied: hasCopiedResults } = useClipboard(
    blockResults ? JSON.stringify(blockResults, null, 2) : ''
  )


  // GraphQL fetch validators (client-side as per migration plan)
  const fetchValidators = async () => {
    try {
      console.log('Block detail: Fetching validators from GraphQL')
      const response = await graphqlQuery<ValidatorsResponse>(GET_VALIDATORS, { first: 100 })
      
      if (response?.validators?.edges) {
        const map: { [key: string]: string } = {}
        response.validators.edges.forEach(({ node: validator }: any) => {
          // Use consensusAddress field directly for matching (same as blocks/index.tsx)
          if (validator.consensusAddress) {
            // Description is already parsed as an object, not a JSON string
            const description = typeof validator.description === 'string' 
              ? parseJsonField(validator.description) as ValidatorDescription | null
              : validator.description as ValidatorDescription | null
            map[validator.consensusAddress] = description?.moniker || 'Unknown'
            console.log('Validator mapping:', { 
              consensusAddress: validator.consensusAddress, 
              moniker: description?.moniker || 'Unknown' 
            })
          }
        })
        setValidatorMap(map)
        console.log(
          'Block detail: Successfully fetched validators from GraphQL, map size:',
          Object.keys(map).length
        )
      }
    } catch (error) {
      console.error('Error fetching validators from GraphQL:', error)
    }
  }

  const getProposerMoniker = (proposerAddress: string) => {
    try {
      if (!proposerAddress) {
        return 'Unknown'
      }

      // Convert comma-separated byte string to bech32 consensus address (same as blocks/index.tsx)
      const consensusAddress = bytesToBech32ConsensusAddress(proposerAddress)
      const moniker = validatorMap[consensusAddress] || 'Unknown'

      return moniker
    } catch (error) {
      console.error('Error converting proposer address:', error)
      return 'Unknown'
    }
  }

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


  // GraphQL data fetching (client-side as per migration plan)
  useEffect(() => {
    if (height) {
      const fetchData = async () => {
        try {
          setIsLoading(true)
          setError(null)

          // Fetch validators first
          await fetchValidators()

          const blockHeight = Array.isArray(height) ? height[0] : height

          // Fetch block data using GraphQL directly
          console.log('Block detail: Fetching block from GraphQL for height:', blockHeight)
          const response = await graphqlQuery<BlockResponse>(GET_BLOCK_BY_HEIGHT, { 
            blockHeight 
          })
          
          if (response?.block) {
            const blockData: GraphQLBlock = {
              blockHeight: response.block.blockHeight,
              blockHash: response.block.blockHash,
              blockTime: response.block.blockTime,
              proposerAddress: response.block.proposerAddress,
              numberOfTx: response.block.numberOfTx,
              appHash: response.block.appHash,
              chainId: response.block.chainId,
              voteExtensions: response.block.voteExtensions,
              consensusHash: response.block.consensusHash,
              dataHash: response.block.dataHash,
              evidenceHash: response.block.evidenceHash,
              nextValidatorsHash: response.block.nextValidatorsHash,
              validatorsHash: response.block.validatorsHash,
            }
            setBlock(blockData)

            // Parse vote extension data from GraphQL (it's a JSON string)
            if (response.block.voteExtensions) {
              try {
                const voteExtData = JSON.parse(response.block.voteExtensions)
                setVoteExtensionData(voteExtData)
              } catch (error) {
                console.error('Error parsing vote extensions:', error)
                // If parsing fails, set the raw string
                setVoteExtensionData(response.block.voteExtensions)
              }
            }

            // Fetch transactions for this block
            const txResponse = await graphqlQuery<TransactionsResponse>(
              GET_TRANSACTIONS_BY_BLOCK_HEIGHT,
              { blockHeight, first: 100 }
            )
            if (txResponse?.transactions?.edges) {
              setTransactions(txResponse.transactions.edges.map(edge => edge.node))
            }

            // Fetch block results separately (different from vote extensions)
            try {
              const results = await getBlockResults(parseInt(blockHeight))
              setBlockResults(results)
            } catch (error) {
              console.error('Error fetching block results:', error)
            }

            console.log('Block detail: Successfully fetched block from GraphQL:', blockData)
          } else {
            setError('Block not found')
          }
        } catch (error) {
          console.error('Error fetching block data from GraphQL:', error)
          setError('Failed to fetch block data from GraphQL indexer. Please try again later.')
        } finally {
          setIsLoading(false)
        }
      }
      
      fetchData()
    }
  }, [height])


  // Helper functions for rendering transaction data
  const decodeTransaction = (txData: string): { messages: any[], fee: Coin[] | undefined } | null => {
    try {
      // txData from GraphQL is a JSON string with the transaction structure
      const jsonData = JSON.parse(txData)
      
      // The transaction structure has auth_info and body at the top level
      // Fee is at: auth_info.fee.amount
      // Messages are at: body.messages
      // There's also a nested "tx" object with events
      const fee = jsonData.auth_info?.fee?.amount
      const messages = jsonData.body?.messages || []
      
      if (messages.length > 0 || fee) {
        return {
          messages,
          fee
        }
      }
      
      // Fallback: try to get from nested tx object
      const tx = jsonData.tx
      if (tx?.body?.messages) {
        return {
          messages: tx.body.messages,
          fee: tx.auth_info?.fee?.amount || jsonData.auth_info?.fee?.amount
        }
      }
      
      // Last fallback: try direct protobuf decoding if JSON parsing doesn't work
      try {
        const txBytes = fromBase64(txData)
        const decoded = TxData.decode(txBytes)
        return {
          messages: decoded.body?.messages || [],
          fee: decoded.authInfo?.fee?.amount
        }
      } catch {}

      return null
    } catch (error) {
      console.error('Error decoding transaction:', error)
      return null
    }
  }

  const renderMessages = (txData: string, txId: string) => {
    try {
      // Parse the transaction data JSON
      const jsonData = JSON.parse(txData)
      const tx = jsonData.tx || jsonData
      
      // Extract message types from events (more reliable than message objects)
      const messageEvents = tx.events?.filter((e: any) => e.type === 'message') || []
      const messageTypes: string[] = []
      
      messageEvents.forEach((event: any) => {
        const actionAttr = event.attributes?.find((a: any) => a.key === 'action')
        if (actionAttr?.value) {
          // Extract the message type from path like "/layer.oracle.MsgSubmitValue"
          const messageType = actionAttr.value.split('.').pop() || actionAttr.value
          if (messageType && !messageTypes.includes(messageType)) {
            messageTypes.push(messageType)
          }
        }
      })
      
      if (messageTypes.length === 0) {
        // Fallback: try to get from decoded messages
        const decoded = decodeTransaction(txData)
        if (decoded?.messages && decoded.messages.length > 0) {
          decoded.messages.forEach((msg: any) => {
            const msgType = msg['@type'] || msg.typeUrl || 'Unknown'
            if (msgType !== 'Unknown' && !messageTypes.includes(msgType)) {
              messageTypes.push(msgType)
            }
          })
        }
      }
      
      if (messageTypes.length === 0) {
        return <Text>No messages</Text>
      }
      
      if (messageTypes.length === 1) {
        return (
          <Link
            as={NextLink}
            href={`/txs/${txId}`}
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}
          >
            <Tag colorScheme="cyan" cursor="pointer">{getTypeMsg(messageTypes[0])}</Tag>
          </Link>
        )
      } else {
        return (
          <HStack>
            <Link
              as={NextLink}
              href={`/txs/${txId}`}
              style={{ textDecoration: 'none' }}
              _focus={{ boxShadow: 'none' }}
            >
              <Tag colorScheme="cyan" cursor="pointer">{getTypeMsg(messageTypes[0])}</Tag>
            </Link>
            <Text textColor="cyan.800">+{messageTypes.length - 1}</Text>
          </HStack>
        )
      }
    } catch (error) {
      console.error('Error rendering messages:', error)
      return <Text>Error</Text>
    }
  }

  const getFee = (txData: string) => {
    const decoded = decodeTransaction(txData)
    if (decoded?.fee && decoded.fee.length > 0) {
      const fee = decoded.fee[0]
      // Fee amount is already in the base denomination (loya), not uloya
      // The amount is a string, so we parse it as-is
      let amount = Number(fee.amount)
      let denom = fee.denom
      
      // If denom starts with 'u', convert from micro-denomination
      if (denom.startsWith('u')) {
        amount = amount / 1_000_000
        denom = denom.slice(1) // Remove 'u' prefix
      }
      
      return (
        <HStack>
          <Text>{amount}</Text>
          <Text textColor="cyan.800">{denom}</Text>
        </HStack>
      )
    }
    return <Text>0 loya</Text>
  }

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
  }

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
        {isLoading ? (
          <Box
            mt={8}
            bg={useColorModeValue('light-container', 'dark-container')}
            shadow={'base'}
            borderRadius={4}
            p={4}
          >
            <Text>Loading block data...</Text>
          </Box>
        ) : error ? (
          <Box
            mt={8}
            bg={useColorModeValue('light-container', 'dark-container')}
            shadow={'base'}
            borderRadius={4}
            p={4}
          >
            <Text color="red.500">Error: {error}</Text>
          </Box>
        ) : block ? (
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
                    <Td>{block.chainId}</Td>
                  </Tr>
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Height</b>
                    </Td>
                    <Td>{block.blockHeight}</Td>
                  </Tr>
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Block Time</b>
                    </Td>
                    <Td>
                      {`${timeFromNow(block.blockTime)} ( ${displayDate(block.blockTime)} )`}
                    </Td>
                  </Tr>
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Block Hash</b>
                    </Td>
                    <Td>
                      {bytesToHex(block.blockHash)}
                    </Td>
                  </Tr>
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Proposer</b>
                    </Td>
                    <Td>{getProposerMoniker(block.proposerAddress)}</Td>
                  </Tr>
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Number of Tx</b>
                    </Td>
                    <Td>{block.numberOfTx}</Td>
                  </Tr>
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Vote Ext Tx</b>
                    </Td>
                    <Td>
                      <Button
                        colorScheme="teal"
                        size="sm"
                        onClick={onTxOpen}
                        isDisabled={!voteExtensionData}
                      >
                        View Vote Extension Transaction
                      </Button>
                    </Td>
                  </Tr>
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Block Results</b>
                    </Td>
                    <Td>
                      <Button
                        colorScheme="teal"
                        size="sm"
                        onClick={onResultsOpen}
                        isDisabled={!blockResults}
                      >
                        View Block Results
                      </Button>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        ) : null}

        {transactions.length > 0 && (
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
                    <Th>TX HASH</Th>
                    <Th>MESSAGES</Th>
                    <Th>FEE</Th>
                    <Th>HEIGHT</Th>
                    <Th>TIME</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {transactions.map((tx) => (
                    <Tr key={tx.id}>
                      <Td>
                        <Link
                          as={NextLink}
                          href={'/txs/' + tx.id}
                          style={{ textDecoration: 'none' }}
                          _focus={{ boxShadow: 'none' }}
                        >
                          <Text color={'cyan.400'}>{trimHash(tx.id)}</Text>
                        </Link>
                      </Td>
                      <Td>{renderMessages(tx.txData, tx.id)}</Td>
                      <Td>{getFee(tx.txData)}</Td>
                      <Td>{tx.blockHeight}</Td>
                      <Td>{timeFromNow(tx.timestamp)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        )}
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
            Vote Extension Transaction for Block {block?.blockHeight}
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
                  handleCopy(onCopyTx, 'Vote extension data copied to clipboard')
                }
                position="absolute"
                top={2}
                right={2}
                size="sm"
              />
              <pre>{JSON.stringify(voteExtensionData, null, 2)}</pre>
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
            Block Results for Block {block?.blockHeight}
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
                  : 'No block results available'}
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

export function pubkeyToAddress(pubkey: string): string {
  const hash = sha256(Buffer.from(pubkey, 'base64'))
  return toHex(hash.slice(0, 20)).toLowerCase()
}
