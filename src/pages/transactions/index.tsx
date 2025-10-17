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
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  VStack,
  Flex,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
  TagLeftIcon,
  TagLabel,
} from '@chakra-ui/react'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSelector } from 'react-redux'
import NextLink from 'next/link'
import {
  FiChevronRight,
  FiHome,
  FiSearch,
  FiRefreshCw,
  FiCheck,
  FiX,
} from 'react-icons/fi'
import { selectTmClient } from '@/store/connectSlice'
import { selectNewBlock } from '@/store/streamSlice'
import { TxEvent } from '@cosmjs/tendermint-rpc'
import { timeFromNow, trimHash, getTypeMsg } from '@/utils/helper'
import { toHex, fromBase64 } from '@cosmjs/encoding'
import { TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { useGraphQLData } from '@/hooks/useGraphQLData'
import {
  GET_TRANSACTIONS,
  SEARCH_TRANSACTIONS,
} from '@/graphql/queries/transactions'
import { GraphQLService, GraphQLTransaction } from '@/services/graphqlService'

const MAX_ROWS = 50

interface Tx {
  TxEvent: TxEvent
  Timestamp: Date
}

interface PaginationState {
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export default function Transactions() {
  const [txs, setTxs] = useState<Tx[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  const tmClient = useSelector(selectTmClient)
  const newBlock = useSelector(selectNewBlock)
  const containerBg = useColorModeValue('light-container', 'dark-container')
  const txHashColor = useColorModeValue('light-theme', 'dark-theme')
  const iconColor = useColorModeValue('light-theme', 'dark-theme')
  const linkColor = useColorModeValue('light-theme', '#45ffe1')

  // GraphQL data fetching
  const {
    data: transactionsData,
    loading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useGraphQLData(
    searchTerm ? SEARCH_TRANSACTIONS : GET_TRANSACTIONS,
    searchTerm
      ? {
          searchTerm,
          limit: MAX_ROWS,
          offset: (pagination.currentPage - 1) * MAX_ROWS,
        }
      : { limit: MAX_ROWS, offset: (pagination.currentPage - 1) * MAX_ROWS }
  )

  const isLoading = transactionsLoading
  const graphqlTransactions = transactionsData?.transactions || []

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
    setIsSearching(term.length > 0)
    // Reset to first page when searching
    setPagination((prev) => ({
      ...prev,
      currentPage: 1,
    }))
  }, [])

  // Refresh data
  const handleRefresh = useCallback(async () => {
    try {
      await refetchTransactions()
    } catch (error) {
      console.error('Error refreshing transactions:', error)
    }
  }, [refetchTransactions])

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

  // Error handling
  useEffect(() => {
    if (transactionsError) {
      const errorMessage =
        typeof transactionsError === 'string'
          ? transactionsError
          : transactionsError?.message || 'An error occurred'
      setError(errorMessage)
    }
  }, [transactionsError])

  const renderMessages = (data: any) => {
    try {
      if (!data) {
        console.warn('No transaction data found')
        return <Tag colorScheme="gray">No Data</Tag>
      }

      // Decode the transaction data
      let decodedTx
      try {
        decodedTx = TxBody.decode(data)
        if (decodedTx.messages && decodedTx.messages.length > 0) {
          if (decodedTx.messages.length === 1) {
            return (
              <Tag colorScheme="cyan">
                {getTypeMsg(decodedTx.messages[0].typeUrl)}
              </Tag>
            )
          } else {
            return (
              <HStack>
                <Tag colorScheme="cyan">
                  {getTypeMsg(decodedTx.messages[0].typeUrl)}
                </Tag>
                <Text textColor="cyan.800">
                  +{decodedTx.messages.length - 1}
                </Text>
              </HStack>
            )
          }
        }
      } catch (decodeError) {
        console.error('Failed to decode transaction:', decodeError)
        return <Tag colorScheme="red">Decode Error</Tag>
      }
    } catch (error) {
      console.error('Error rendering message:', error)
      return <Tag colorScheme="gray">Error</Tag>
    }
    return <Tag colorScheme="gray">Unknown</Tag>
  }

  // Convert GraphQL transactions to display format
  const displayTransactions = useMemo(() => {
    if (graphqlTransactions.length > 0) {
      return graphqlTransactions.map((tx: GraphQLTransaction) => ({
        id: tx.id,
        hash: tx.id,
        height: parseInt(tx.blockHeight),
        timestamp: new Date(tx.timestamp),
        txData: tx.txData,
        success: true, // GraphQL transactions are typically successful
      }))
    }
    return []
  }, [graphqlTransactions])

  useEffect(() => {
    if (newBlock?.txs?.length) {
      for (const tx of newBlock.txs) {
      }
    }
  }, [newBlock])

  return (
    <>
      <Head>
        <title>Transactions | Tellor Explorer</title>
        <meta name="description" content="Transactions | Tellor Explorer" />
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

        <Box mt={8} bg={containerBg} shadow={'base'} borderRadius={4} p={4}>
          {/* Enhanced Header with Search and Controls */}
          <Flex justify="space-between" align="center" mb={4}>
            <HStack spacing={4}>
              <InputGroup maxW="400px">
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiSearch} color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Search by transaction hash or data..."
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
              {isSearching && (
                <Badge colorScheme="orange" variant="subtle">
                  Searching
                </Badge>
              )}
            </HStack>
          </Flex>

          {isLoading ? (
            <VStack spacing={4} py={8}>
              <Spinner size="lg" />
              <Text>Loading transactions...</Text>
            </VStack>
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
                      <Th>Tx Hash</Th>
                      <Th>Height</Th>
                      <Th>Status</Th>
                      <Th>Messages</Th>
                      <Th>Time</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {displayTransactions.map((tx: any) => (
                      <Tr key={tx.id}>
                        <Td>
                          <Link
                            as={NextLink}
                            href={'/txs/' + tx.hash.toUpperCase()}
                            style={{ textDecoration: 'none' }}
                            _focus={{ boxShadow: 'none' }}
                          >
                            <Text color={linkColor}>{trimHash(tx.hash)}</Text>
                          </Link>
                        </Td>
                        <Td>
                          <Link
                            as={NextLink}
                            href={'/blocks/' + tx.height}
                            style={{ textDecoration: 'none' }}
                            _focus={{ boxShadow: 'none' }}
                          >
                            <Text color={linkColor}>{tx.height}</Text>
                          </Link>
                        </Td>
                        <Td>
                          <Tag variant="subtle" colorScheme="green">
                            <TagLeftIcon as={FiCheck} />
                            <TagLabel>Success</TagLabel>
                          </Tag>
                        </Td>
                        <Td>{renderMessages(tx.txData)}</Td>
                        <Td>{timeFromNow(tx.timestamp.toISOString())}</Td>
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
                  Showing {displayTransactions.length} transactions
                  {isSearching && ` (filtered by "${searchTerm}")`}
                </Text>
              </Flex>
            </>
          )}
        </Box>
      </main>
    </>
  )
}
