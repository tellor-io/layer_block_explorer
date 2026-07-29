import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  useColorModeValue,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertDescription,
  HStack,
  Icon,
  Link,
  Divider,
  Tooltip,
  useToast,
  Flex,
  Select,
  IconButton,
} from '@chakra-ui/react'
import { ChevronLeftIcon, ChevronRightIcon, ArrowLeftIcon } from '@chakra-ui/icons'
import Head from 'next/head'
import NextLink from 'next/link'
import { FiHome, FiChevronRight, FiCopy } from 'react-icons/fi'
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_WITHDRAWALS } from '@/datasources/graphql/queries'
import type {
  WithdrawalsResponse,
  Withdraw,
  PageInfo,
} from '@/datasources/graphql/types'

type PageCursors = { startCursor: string | null; endCursor: string | null }

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50]

export default function BridgeWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdraw[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [pagesCursors, setPagesCursors] = useState<PageCursors[]>([])
  const pagesCursorsRef = useRef<PageCursors[]>([])
  const toast = useToast()

  useEffect(() => {
    pagesCursorsRef.current = pagesCursors
  }, [pagesCursors])

  const applyPageResponse = (
    response: WithdrawalsResponse,
    nextPageIndex: number,
    replaceCursors: boolean
  ) => {
    if (!response.withdraws?.edges) {
      throw new Error('Invalid response from GraphQL')
    }

    const withdrawalsData = response.withdraws.edges.map((edge) => edge.node)
    setWithdrawals(withdrawalsData)
    setPageInfo(response.withdraws.pageInfo)

    const cursors: PageCursors = {
      startCursor: response.withdraws.pageInfo.startCursor,
      endCursor: response.withdraws.pageInfo.endCursor,
    }

    if (replaceCursors || nextPageIndex === 0) {
      setPagesCursors([cursors])
    } else if (nextPageIndex >= pagesCursorsRef.current.length) {
      setPagesCursors((prev) => [...prev, cursors])
    } else {
      setPagesCursors((prev) => {
        const next = [...prev]
        next[nextPageIndex] = cursors
        return next
      })
    }

    setPageIndex(nextPageIndex)
  }

  const fetchPage = useCallback(
    async (after: string | null | undefined, size: number) => {
      return graphqlQuery<WithdrawalsResponse>(GET_WITHDRAWALS, {
        first: size,
        ...(after ? { after } : {}),
        orderBy: ['BLOCK_HEIGHT_DESC'],
      })
    },
    []
  )

  const fetchFirstPage = useCallback(
    async (size: number) => {
      setError(null)
      setLoading(true)
      try {
        const response = await fetchPage(null, size)
        applyPageResponse(response, 0, true)
      } catch (err) {
        console.error('Error fetching withdrawals:', err)
        setError(
          'Failed to fetch data. Please check your network connection and try again.'
        )
        setWithdrawals([])
      } finally {
        setLoading(false)
      }
    },
    [fetchPage]
  )

  useEffect(() => {
    fetchFirstPage(pageSize)
    // Initial load only; later page/size changes use handlers below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFirstPage = async () => {
    if (pageIndex === 0 || loading) return
    await fetchFirstPage(pageSize)
  }

  const handlePreviousPage = async () => {
    if (pageIndex === 0 || loading) return

    try {
      setLoading(true)
      setError(null)
      const prevPageIndex = pageIndex - 1

      if (prevPageIndex === 0) {
        const response = await fetchPage(null, pageSize)
        applyPageResponse(response, 0, true)
      } else {
        const prevPageCursors = pagesCursorsRef.current[prevPageIndex - 1]
        if (!prevPageCursors?.endCursor) {
          const response = await fetchPage(null, pageSize)
          applyPageResponse(response, 0, true)
        } else {
          const response = await fetchPage(prevPageCursors.endCursor, pageSize)
          applyPageResponse(response, prevPageIndex, false)
        }
      }
    } catch (err) {
      console.error('Error fetching previous withdrawals page:', err)
      setError('Failed to fetch previous page. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleNextPage = async () => {
    if (!pageInfo?.hasNextPage || loading) return

    try {
      setLoading(true)
      setError(null)
      const currentPageCursors = pagesCursorsRef.current[pageIndex]
      const after =
        currentPageCursors?.endCursor || pageInfo.endCursor || null
      if (!after) {
        throw new Error('No cursor available for next page')
      }
      const response = await fetchPage(after, pageSize)
      applyPageResponse(response, pageIndex + 1, false)
    } catch (err) {
      console.error('Error fetching next withdrawals page:', err)
      setError('Failed to fetch next page. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePageSizeChange = async (newSize: number) => {
    setPageSize(newSize)
    await fetchFirstPage(newSize)
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Unknown'
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Address copied!',
      status: 'success',
      duration: 2000,
      isClosable: true,
    })
  }

  return (
    <>
      <Head>
        <title>Bridge Withdrawals | Tellor Explorer</title>
        <meta name="description" content="View Bridge Withdrawals" />
      </Head>
      <main>
        <HStack h="24px" mb={2}>
          <Heading size={'md'}>Bridge Withdrawals</Heading>
          <Divider borderColor={'gray'} size="10px" orientation="vertical" />
          <Link
            as={NextLink}
            href={'/'}
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}
          >
            <Icon
              fontSize="16"
              color={useColorModeValue('light-theme', 'dark-theme')}
              as={FiHome}
            />
          </Link>
          <Icon fontSize="16" as={FiChevronRight} />
          <Text>Bridge Withdrawals</Text>
        </HStack>
        <Text fontSize="sm" color="gray.500" mb={6}>
          Data updates every 5 minutes and may not reflect the latest on-chain
          activity.
        </Text>

        <Box
          bg={useColorModeValue('light-container', 'dark-container')}
          borderRadius="lg"
          boxShadow="xl"
          p={6}
        >
          {loading && withdrawals.length === 0 ? (
            <Center py={10}>
              <Spinner size="xl" />
            </Center>
          ) : error && withdrawals.length === 0 ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : withdrawals.length === 0 ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription>No withdrawals found.</AlertDescription>
            </Alert>
          ) : (
            <>
              <Box
                overflowX="auto"
                maxW="100%"
                width="100%"
                opacity={loading ? 0.6 : 1}
              >
                <Table variant="simple" width="100%">
                  <Thead>
                    <Tr>
                      <Th>Type</Th>
                      <Th>ID</Th>
                      <Th>Sender</Th>
                      <Th>Recipient</Th>
                      <Th isNumeric>Amount (TRB)</Th>
                      <Th>Time</Th>
                      <Th>Claimed</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {withdrawals.map((withdrawal) => (
                      <Tr key={`withdrawal-${withdrawal.depositId}`}>
                        <Td>
                          <Text color="green.500">Withdrawal</Text>
                        </Td>
                        <Td>{withdrawal.depositId}</Td>
                        <Td>
                          <Tooltip
                            label="Click to copy address"
                            placement="top"
                            hasArrow
                          >
                            <HStack
                              spacing={1}
                              cursor="pointer"
                              onClick={() =>
                                copyToClipboard(withdrawal.sender)
                              }
                              _hover={{ color: 'blue.500' }}
                            >
                              <Text
                                isTruncated
                                maxW="150px"
                                title={withdrawal.sender}
                              >
                                {withdrawal.sender}
                              </Text>
                              <Icon as={FiCopy} boxSize={3} opacity={0.7} />
                            </HStack>
                          </Tooltip>
                        </Td>
                        <Td>
                          <Tooltip
                            label="Click to copy address"
                            placement="top"
                            hasArrow
                          >
                            <HStack
                              spacing={1}
                              cursor="pointer"
                              onClick={() =>
                                copyToClipboard(withdrawal.recipient)
                              }
                              _hover={{ color: 'blue.500' }}
                            >
                              <Text
                                isTruncated
                                maxW="150px"
                                title={withdrawal.recipient}
                              >
                                {withdrawal.recipient}
                              </Text>
                              <Icon as={FiCopy} boxSize={3} opacity={0.7} />
                            </HStack>
                          </Tooltip>
                        </Td>
                        <Td isNumeric>
                          {(
                            Number(withdrawal.amount) / 1_000_000
                          ).toLocaleString()}
                        </Td>
                        <Td>
                          <Tooltip
                            label={`Block #${withdrawal.blockHeight}`}
                            placement="top"
                            hasArrow
                          >
                            <Text>
                              {formatDate(
                                withdrawal.withdrawalInitiatedTimestamp
                                  ? new Date(
                                      withdrawal.withdrawalInitiatedTimestamp
                                    )
                                  : undefined
                              )}
                            </Text>
                          </Tooltip>
                        </Td>
                        <Td>
                          {withdrawal.claimed ? (
                            <Text color="green.500">True</Text>
                          ) : (
                            <Text color="red.500">False</Text>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>

              <Flex
                mt={4}
                justify="space-between"
                align="center"
                wrap="wrap"
                gap={4}
              >
                <Flex align="center" gap={2}>
                  <Select
                    w={32}
                    value={pageSize}
                    onChange={(e) =>
                      handlePageSizeChange(Number(e.target.value))
                    }
                    disabled={loading}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        Show {size}
                      </option>
                    ))}
                  </Select>
                  <Text fontSize="sm" color="gray.500">
                    Page {pageIndex + 1}
                  </Text>
                </Flex>
                <Flex align="center" gap={2}>
                  <Tooltip label="First Page">
                    <IconButton
                      onClick={handleFirstPage}
                      isDisabled={pageIndex === 0 || loading}
                      icon={<ArrowLeftIcon h={3} w={3} />}
                      aria-label="First Page"
                      size="sm"
                    />
                  </Tooltip>
                  <Tooltip label="Previous Page">
                    <IconButton
                      onClick={handlePreviousPage}
                      isDisabled={pageIndex === 0 || loading}
                      icon={<ChevronLeftIcon h={6} w={6} />}
                      aria-label="Previous Page"
                      size="sm"
                    />
                  </Tooltip>
                  <Tooltip label="Next Page">
                    <IconButton
                      onClick={handleNextPage}
                      isDisabled={!pageInfo?.hasNextPage || loading}
                      icon={<ChevronRightIcon h={6} w={6} />}
                      aria-label="Next Page"
                      size="sm"
                    />
                  </Tooltip>
                </Flex>
              </Flex>
            </>
          )}
        </Box>
      </main>
    </>
  )
}
