import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { NewBlockEvent, TxEvent } from '@cosmjs/tendermint-rpc'
import {
  Box,
  Divider,
  HStack,
  Heading,
  Icon,
  Link,
  Table,
  useColorModeValue,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Tag,
  TagLeftIcon,
  TagLabel,
  Tooltip,
  useClipboard,
  Alert,
  AlertIcon,
  AlertDescription,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  VStack,
  Flex,
  Badge,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import {
  FiChevronRight,
  FiHome,
  FiCheck,
  FiX,
  FiCopy,
  FiSearch,
  FiRefreshCw,
} from 'react-icons/fi'
import { selectNewBlock, selectTxEvent } from '@/store/streamSlice'
import { toHex } from '@cosmjs/encoding'
import { TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { timeFromNow, trimHash, getTypeMsg } from '@/utils/helper'
import { sha256 } from '@cosmjs/crypto'
import { CopyableHash } from '@/components/CopyableHash'
import { selectTmClient, selectRPCAddress } from '@/store/connectSlice'
import Head from 'next/head'
import { useRealTimeBlocks } from '@/hooks/useRealTimeBlocks'
import { GraphQLService, GraphQLBlock } from '@/services/graphqlService'
import { useGraphQLData } from '@/hooks/useGraphQLData'
import { GET_BLOCKS } from '@/graphql/queries/blocks'
import { useApolloContext } from '@/pages/_app'

const MAX_ROWS = 20

interface Tx {
  TxEvent: TxEvent
  Timestamp: Date
}

interface Validator {
  operator_address: string
  consensus_pubkey: {
    '@type': string
    key: string
  }
  description: {
    moniker: string
  }
}

interface ValidatorMap {
  [key: string]: string
}

interface PaginationState {
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export default function Blocks() {
  const newBlock = useSelector(selectNewBlock)
  const txEvent = useSelector(selectTxEvent)
  const tmClient = useSelector(selectTmClient)
  const rpcAddress = useSelector(selectRPCAddress)
  const [txs, setTxs] = useState<Tx[]>([])
  const [validatorMap, setValidatorMap] = useState<ValidatorMap>({})
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  // Get Apollo Client state
  const { client: apolloClient, isInitialized, isInitializing, error: apolloError } = useApolloContext()

  // Color mode values
  const iconColor = useColorModeValue('light-theme', 'dark-theme')
  const containerBg = useColorModeValue('light-container', 'dark-container')
  const tabBg = useColorModeValue('light-theme', 'dark-theme')
  const tabTextColor = useColorModeValue('gray.600', 'gray.200')
  const tabHoverColor = useColorModeValue('black', 'black')
  const linkColor = useColorModeValue('light-theme', '#45ffe1')
  const txLinkColor = useColorModeValue('light-theme', 'dark-theme')
  const selectedTextColor = useColorModeValue('white', 'black')
  const selectedBgColor = useColorModeValue('light-theme', 'dark-theme')
  const heightLinkColor = useColorModeValue('light-theme', '#45ffe1')
  const txHashColor = useColorModeValue('light-theme', 'dark-theme')

  // Enhanced GraphQL data fetching with pagination - only if Apollo Client is ready
  const {
    data: blocksData,
    loading: blocksLoading,
    error: blocksError,
    refetch: refetchBlocks,
  } = useGraphQLData(GET_BLOCKS, {
    limit: MAX_ROWS,
    offset: (pagination.currentPage - 1) * MAX_ROWS,
  }, {
    skip: !apolloClient || !isInitialized, // Skip GraphQL queries if Apollo Client is not ready
  })

  // Use the GraphQL-based real-time blocks hook for live updates - only if Apollo Client is ready
  const {
    blocks: realtimeBlocks,
    isLoading: realtimeLoading,
    error: realtimeError,
    refetch: refetchRealtime,
  } = useRealTimeBlocks({
    limit: MAX_ROWS,
    offset: 0,
    enableSubscription: !!(apolloClient && isInitialized), // Only enable subscription if Apollo Client is ready
  })

  // Combine static and real-time data
  const graphqlBlocks = useMemo(() => {
    if (pagination.currentPage === 1) {
      // For the first page, use real-time data if available
      return realtimeBlocks.length > 0
        ? realtimeBlocks
        : blocksData?.blocks?.edges?.map((edge: any) => edge.node) || []
    }
    // For other pages, use static data
    return blocksData?.blocks?.edges?.map((edge: any) => edge.node) || []
  }, [blocksData, realtimeBlocks, pagination.currentPage])

  const isLoading = isInitializing || blocksLoading || realtimeLoading

  // Show loading state while Apollo Client is initializing
  if (isInitializing) {
    return (
      <>
        <Head>
          <title>Blocks | Tellor Explorer</title>
          <meta name="description" content="Blocks | Tellor Explorer" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main>
          <HStack h="24px">
            <Heading size={'md'}>Blocks</Heading>
            <Divider borderColor={'gray'} size="10px" orientation="vertical" />
            <Link
              as={NextLink}
              href={'/'}
              style={{ textDecoration: 'none' }}
              _focus={{ boxShadow: 'none' }}
              display="flex"
              justifyContent="center"
            >
              <Icon fontSize="16" color={iconColor} as={FiHome} />
            </Link>
            <Icon fontSize="16" as={FiChevronRight} />
            <Text>Blocks</Text>
          </HStack>
          <Box mt={8} bg={containerBg} shadow={'base'} borderRadius={4} p={4}>
            <VStack spacing={4} py={8}>
              <Spinner size="lg" />
              <Text>Initializing GraphQL connection...</Text>
            </VStack>
          </Box>
        </main>
      </>
    )
  }

  // Show error state if Apollo Client failed to initialize
  if (apolloError) {
    return (
      <>
        <Head>
          <title>Blocks | Tellor Explorer</title>
          <meta name="description" content="Blocks | Tellor Explorer" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main>
          <HStack h="24px">
            <Heading size={'md'}>Blocks</Heading>
            <Divider borderColor={'gray'} size="10px" orientation="vertical" />
            <Link
              as={NextLink}
              href={'/'}
              style={{ textDecoration: 'none' }}
              _focus={{ boxShadow: 'none' }}
              display="flex"
              justifyContent="center"
            >
              <Icon fontSize="16" color={iconColor} as={FiHome} />
            </Link>
            <Icon fontSize="16" as={FiChevronRight} />
            <Text>Blocks</Text>
          </HStack>
          <Box mt={8} bg={containerBg} shadow={'base'} borderRadius={4} p={4}>
            <Alert status="error">
              <AlertIcon />
              <AlertDescription>
                GraphQL connection failed: {apolloError}. The page will work with limited functionality.
              </AlertDescription>
            </Alert>
          </Box>
        </main>
      </>
    )
  }

  // Convert GraphQL blocks to NewBlockEvent format for compatibility
  const blocks = useMemo(() => {
    return graphqlBlocks.map(
      (block: GraphQLBlock): NewBlockEvent => ({
        header: {
          version: { block: 0, app: 0 },
          height: parseInt(block.blockHeight),
          time: new Date(block.blockTime),
          proposerAddress: new Uint8Array(
            Buffer.from(block.proposerAddress, 'hex')
          ),
          chainId: block.chainId || '',
          lastBlockId: {
            hash: new Uint8Array(),
            parts: { total: 0, hash: new Uint8Array() },
          },
          lastCommitHash: new Uint8Array(
            Buffer.from(block.consensusHash || '', 'hex')
          ),
          dataHash: new Uint8Array(Buffer.from(block.dataHash || '', 'hex')),
          validatorsHash: new Uint8Array(
            Buffer.from(block.validatorsHash || '', 'hex')
          ),
          nextValidatorsHash: new Uint8Array(
            Buffer.from(block.nextValidatorsHash || '', 'hex')
          ),
          consensusHash: new Uint8Array(
            Buffer.from(block.consensusHash || '', 'hex')
          ),
          appHash: new Uint8Array(Buffer.from(block.appHash || '', 'hex')),
          lastResultsHash: new Uint8Array(),
          evidenceHash: new Uint8Array(
            Buffer.from(block.evidenceHash || '', 'hex')
          ),
        },
        txs: [] as readonly Uint8Array[], // GraphQL doesn't provide transaction data in blocks query
        lastCommit: null, // Use null instead of undefined for compatibility
        evidence: [] as readonly any[], // Use empty array instead of null for compatibility
      })
    )
  }, [graphqlBlocks])

  const tabStyles = useMemo(
    () => ({
      selected: {
        color: selectedTextColor,
        bg: selectedBgColor,
      },
      hover: {
        bg: 'button-hover',
        color: tabHoverColor,
      },
      normal: {
        color: tabTextColor,
        borderRadius: 5,
      },
    }),
    [selectedTextColor, selectedBgColor, tabHoverColor, tabTextColor]
  )

  // Pagination handlers
  const handleNextPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      currentPage: prev.currentPage + 1,
    }))
  }, [])

  const handlePreviousPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      currentPage: Math.max(1, prev.currentPage - 1),
    }))
  }, [])

  const handleFirstPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      currentPage: 1,
    }))
  }, [])

  // Search functionality
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
    // Reset to first page when searching
    setPagination((prev) => ({
      ...prev,
      currentPage: 1,
    }))
  }, [])

  // Refresh data
  const handleRefresh = useCallback(async () => {
    try {
      if (pagination.currentPage === 1) {
        await refetchRealtime()
      }
      await refetchBlocks()
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
  }, [pagination.currentPage, refetchRealtime, refetchBlocks])

  const fetchValidators = async () => {
    if (tmClient) {
      try {
        // Use GraphQL service to fetch validators
        const validatorsResponse = await GraphQLService.getValidators()
        if (validatorsResponse?.length > 0) {
          const map: { [key: string]: string } = {}
          validatorsResponse.forEach((validator: any) => {
            if (validator.consensusAddress) {
              map[validator.consensusAddress.toLowerCase()] =
                validator.description?.moniker || 'Unknown'
            }
          })
          setValidatorMap(map)
          console.log(
            'Blocks page: Successfully fetched validators via GraphQL, map size:',
            Object.keys(map).length
          )
        }
      } catch (error) {
        console.error('Error fetching validators via GraphQL:', error)
        // Fallback to RPC if GraphQL fails
        try {
          const { getValidators } = await import('@/rpc/query')
          const endpoint = await import('@/utils/rpcManager').then((m) =>
            m.rpcManager.getCurrentEndpoint()
          )
          const validatorsResponse = await getValidators(endpoint)
          if (validatorsResponse?.validators) {
            const map: { [key: string]: string } = {}
            validatorsResponse.validators.forEach((validator: Validator) => {
              const hexAddress = pubkeyToAddress(validator.consensus_pubkey.key)
              map[hexAddress] = validator.description.moniker
            })
            setValidatorMap(map)
            console.log(
              'Blocks page: Successfully fetched validators via RPC fallback, map size:',
              Object.keys(map).length
            )
          }
        } catch (rpcError) {
          console.error('Error fetching validators via RPC fallback:', rpcError)
        }
      }
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        console.log(
          'Blocks page: RPC address changed, refetching data. New address:',
          rpcAddress
        )

        // Clear old data when switching endpoints
        setTxs([])
        setError(null)

        // Add a small delay to ensure RPC manager has updated when switching endpoints
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Fetch validators using new endpoint
        await fetchValidators()

        // Refetch blocks using GraphQL
        await handleRefresh()
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('An unexpected error occurred.')
        setTxs([])
      }
    }
    fetchData()
  }, [tmClient, rpcAddress, handleRefresh])

  // Update error state when blocks error occurs
  useEffect(() => {
    if (blocksError || realtimeError || apolloError) {
      const errorMessage = blocksError || realtimeError || apolloError
      setError(
        typeof errorMessage === 'string'
          ? errorMessage
          : errorMessage?.message || 'An error occurred'
      )
    }
  }, [blocksError, realtimeError, apolloError])

  useEffect(() => {
    if (newBlock) {
      updateBlocks(newBlock)
    }
  }, [newBlock])

  useEffect(() => {
    if (txEvent) {
      updateTxs(txEvent)
    }
  }, [txEvent])

  const updateBlocks = (block: NewBlockEvent) => {
    // This is now handled by the useRealTimeBlocks hook
    // The hook automatically manages real-time updates via GraphQL subscriptions
  }

  const updateTxs = (txEvent: TxEvent) => {
    const tx = {
      TxEvent: {
        ...txEvent,
        result: {
          ...txEvent.result,
          data:
            txEvent.tx && txEvent.tx.length > 0
              ? txEvent.tx
              : txEvent.result.data,
        },
      },
      Timestamp: new Date(),
    }

    setTxs((prevTxs) => {
      const exists = prevTxs.some(
        (existingTx) => toHex(existingTx.TxEvent.hash) === toHex(txEvent.hash)
      )

      if (!exists) {
        return [tx, ...prevTxs.slice(0, MAX_ROWS - 1)]
      }
      return prevTxs
    })
  }

  const getProposerMoniker = (proposerAddress: Uint8Array) => {
    try {
      // Convert proposer address to the same format as validator consensus pubkey addresses
      const hexAddress = toHex(proposerAddress).toLowerCase()
      const moniker = validatorMap[hexAddress] || 'Unknown'
      return moniker
    } catch (error) {
      console.error('Error converting proposer address:', error)
      return 'Unknown'
    }
  }

  const renderMessages = (data: Uint8Array | undefined) => {
    if (!data) return ''

    try {
      // First try to decode as protobuf
      try {
        const txBody = TxBody.decode(data)
        if (txBody.messages && txBody.messages.length > 0) {
          if (txBody.messages.length === 1) {
            return (
              <HStack>
                <Tag colorScheme="cyan">
                  {getTypeMsg(txBody.messages[0].typeUrl)}
                </Tag>
              </HStack>
            )
          } else {
            return (
              <HStack>
                <Tag colorScheme="cyan">
                  {getTypeMsg(txBody.messages[0].typeUrl)}
                </Tag>
                <Text textColor="cyan.800">+{txBody.messages.length - 1}</Text>
              </HStack>
            )
          }
        }
      } catch (e) {
        // If protobuf fails, try JSON
        const jsonStr =
          typeof data === 'string' ? data : new TextDecoder().decode(data)
        const jsonData = JSON.parse(jsonStr)

        const messages = jsonData.messages || jsonData.body?.messages || []
        if (messages.length > 0) {
          if (messages.length === 1) {
            return (
              <HStack>
                <Tag colorScheme="cyan">
                  {getTypeMsg(messages[0].typeUrl || messages[0]['@type'])}
                </Tag>
              </HStack>
            )
          } else {
            return (
              <HStack>
                <Tag colorScheme="cyan">
                  {getTypeMsg(messages[0].typeUrl || messages[0]['@type'])}
                </Tag>
                <Text textColor="cyan.800">+{messages.length - 1}</Text>
              </HStack>
            )
          }
        }
      }

      return <Tag colorScheme="gray">Unknown Format</Tag>
    } catch (error) {
      return <Tag colorScheme="gray">Error</Tag>
    }
  }

  return (
    <>
      <Head>
        <title>Blocks | Tellor Explorer</title>
        <meta name="description" content="Blocks | Tellor Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Blocks</Heading>
          <Divider borderColor={'gray'} size="10px" orientation="vertical" />
          <Link
            as={NextLink}
            href={'/'}
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}
            display="flex"
            justifyContent="center"
          >
            <Icon fontSize="16" color={iconColor} as={FiHome} />
          </Link>
          <Icon fontSize="16" as={FiChevronRight} />
          <Text>Blocks</Text>
        </HStack>
        <Box mt={8} bg={containerBg} shadow={'base'} borderRadius={4} p={4}>
          {/* Enhanced Header with Search and Controls */}
          <Flex justify="space-between" align="center" mb={4}>
            <HStack spacing={4}>
              <InputGroup maxW="300px">
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiSearch} color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Search by block hash or proposer..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </InputGroup>
              <Button
                leftIcon={<Icon as={FiRefreshCw} />}
                onClick={handleRefresh}
                isLoading={isLoading}
                size="sm"
                variant="outline"
              >
                Refresh
              </Button>
            </HStack>
            <HStack spacing={2}>
              <Badge colorScheme="blue" variant="subtle">
                Page {pagination.currentPage}
              </Badge>
              {pagination.currentPage === 1 && (
                <Badge colorScheme="green" variant="subtle">
                  Live Updates
                </Badge>
              )}
            </HStack>
          </Flex>

          <Tabs variant="unstyled">
            <TabList>
              <Tab
                _selected={tabStyles.selected}
                _hover={tabStyles.hover}
                {...tabStyles.normal}
              >
                Blocks
              </Tab>
              {/* <Tab
                _selected={tabStyles.selected}
                _hover={tabStyles.hover}
                {...tabStyles.normal}
              >
                Transactions
              </Tab> */}
            </TabList>
            <TabPanels>
              <TabPanel>
                {isLoading ? (
                  <VStack spacing={4} py={8}>
                    <Spinner size="lg" />
                    <Text>Loading blocks...</Text>
                  </VStack>
                ) : !apolloClient ? (
                  <Alert status="warning">
                    <AlertIcon />
                    <AlertDescription>
                      GraphQL connection is not available. Some features may be limited.
                    </AlertDescription>
                  </Alert>
                ) : error ? (
                  <Alert status="error">
                    <AlertIcon />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <TableContainer>
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Height</Th>
                            <Th>App Hash</Th>
                            <Th>Proposer</Th>
                            <Th>Txs</Th>
                            <Th>Time</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {blocks.map((block: NewBlockEvent) => (
                            <Tr
                              key={`block-${
                                block.header.height
                              }-${block.header.time.getTime()}`}
                            >
                              <Td>
                                <Link
                                  as={NextLink}
                                  href={'/blocks/' + block.header.height}
                                  style={{ textDecoration: 'none' }}
                                  _focus={{ boxShadow: 'none' }}
                                >
                                  <Text color={heightLinkColor}>
                                    {block.header.height}
                                  </Text>
                                </Link>
                              </Td>
                              <Td noOfLines={1}>
                                <CopyableHash hash={block.header.appHash} />
                              </Td>
                              <Td>
                                {getProposerMoniker(
                                  block.header.proposerAddress
                                )}
                              </Td>
                              <Td>{block.txs?.length || 0}</Td>
                              <Td>
                                {timeFromNow(block.header.time.toISOString())}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>

                    {/* Pagination Controls */}
                    <Flex justify="space-between" align="center" mt={4}>
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          onClick={handleFirstPage}
                          isDisabled={pagination.currentPage === 1}
                        >
                          First
                        </Button>
                        <Button
                          size="sm"
                          onClick={handlePreviousPage}
                          isDisabled={pagination.currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleNextPage}
                          isDisabled={!pagination.hasNextPage}
                        >
                          Next
                        </Button>
                      </HStack>
                      <Text fontSize="sm" color="gray.500">
                        Showing {blocks.length} blocks
                      </Text>
                    </Flex>
                  </>
                )}
              </TabPanel>
              <TabPanel>
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Tx Hash</Th>
                        <Th>Result</Th>
                        <Th>Messages</Th>
                        <Th>Height</Th>
                        <Th>Time</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {txs.map((tx) => (
                        <Tr
                          key={`${toHex(
                            tx.TxEvent.hash
                          )}-${tx.Timestamp.getTime()}`}
                        >
                          <Td>
                            <Link
                              as={NextLink}
                              href={
                                '/txs/' + toHex(tx.TxEvent.hash).toUpperCase()
                              }
                              style={{ textDecoration: 'none' }}
                              _focus={{ boxShadow: 'none' }}
                            >
                              <Text color={txHashColor}>
                                {trimHash(tx.TxEvent.hash)}
                              </Text>
                            </Link>
                          </Td>
                          <Td>
                            {tx.TxEvent.result.code == 0 ? (
                              <Tag variant="subtle" colorScheme="green">
                                <TagLeftIcon as={FiCheck} />
                                <TagLabel>Success</TagLabel>
                              </Tag>
                            ) : (
                              <Tag variant="subtle" colorScheme="red">
                                <TagLeftIcon as={FiX} />
                                <TagLabel>Error</TagLabel>
                              </Tag>
                            )}
                          </Td>
                          <Td>{renderMessages(tx.TxEvent.result.data)}</Td>
                          <Td>{tx.TxEvent.height}</Td>
                          <Td>{timeFromNow(tx.Timestamp.toISOString())}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </main>
    </>
  )
}
export function pubkeyToAddress(pubkey: string): string {
  const hash = sha256(Buffer.from(pubkey, 'base64'))
  return toHex(hash.slice(0, 20)).toLowerCase()
}
