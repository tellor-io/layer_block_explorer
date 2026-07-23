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
import { formatEther } from 'ethers'
import Head from 'next/head'
import NextLink from 'next/link'
import { FiHome, FiChevronRight, FiCopy } from 'react-icons/fi'
import { graphqlQuery } from '@/datasources/graphql/client'
import {
  GET_BRIDGE_DEPOSITS,
  GET_AGGREGATE_REPORTS_BY_QUERY_ID,
} from '@/datasources/graphql/queries'
import type {
  BridgeDepositsResponse,
  AggregateReportsResponse,
  PageInfo,
} from '@/datasources/graphql/types'
import { generateDepositQueryId } from '@/utils/bridgeContract'

interface Deposit {
  id: number
  depositId: number
  sender: string
  recipient: string
  amount: bigint
  tip: bigint
  blockHeight: bigint | null
  blockTimestamp: Date
  reported: boolean
  claimed: boolean
}

interface ReportStatus {
  isReported: boolean
  data?: any
}

type PageCursors = { startCursor: string | null; endCursor: string | null }

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50]

export default function BridgeDeposits() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [reportStatuses, setReportStatuses] = useState<
    Record<number, ReportStatus>
  >({})
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

  const fetchReportDetails = async (depositId: number) => {
    try {
      const queryId = generateDepositQueryId(depositId)

      const response = await graphqlQuery<AggregateReportsResponse>(
        GET_AGGREGATE_REPORTS_BY_QUERY_ID,
        {
          queryId: queryId,
          first: 1,
        }
      )

      if (!response.aggregateReports.edges.length) {
        return null
      }

      const latestReport = response.aggregateReports.edges[0].node
      const hasValidData = latestReport.value && latestReport.value.length > 0

      if (!hasValidData) {
        return null
      }

      return {
        aggregate: {
          aggregate_value: latestReport.value,
          query_id: latestReport.queryId,
          block_height: latestReport.blockHeight,
          timestamp: latestReport.timestamp,
          total_reporters: latestReport.totalReporters,
          aggregate_power: latestReport.aggregatePower,
          micro_report_height: latestReport.microReportHeight,
        },
        queryId: latestReport.queryId,
        value: latestReport.value,
        blockHeight: latestReport.blockHeight,
        timestamp: latestReport.timestamp,
        queryData: latestReport.queryData,
      }
    } catch (err) {
      console.error(
        `Error fetching report details for deposit ${depositId}:`,
        err
      )
      return null
    }
  }

  const mapDeposits = (response: BridgeDepositsResponse): Deposit[] =>
    response.bridgeDeposits.edges.map((edge) => {
      const node = edge.node
      const timestamp = new Date(Number(node.timestamp) * 1000)

      return {
        id: node.depositId,
        depositId: node.depositId,
        sender: node.sender,
        recipient: node.recipient,
        amount: BigInt(node.amount),
        tip: BigInt(node.tip),
        blockHeight: node.blockHeight ? BigInt(node.blockHeight) : null,
        blockTimestamp: timestamp,
        reported: node.reported,
        claimed: node.claimed,
      }
    })

  const loadReportStatuses = async (formattedDeposits: Deposit[]) => {
    const reportedDeposits = formattedDeposits.filter((d) => d.reported)
    const reportDetails = await Promise.all(
      reportedDeposits.map((deposit) =>
        fetchReportDetails(deposit.depositId).then((data) => ({
          depositId: deposit.depositId,
          data,
        }))
      )
    )

    const statusMap: Record<number, ReportStatus> = {}
    formattedDeposits.forEach((deposit) => {
      statusMap[deposit.depositId] = {
        isReported: deposit.reported,
        data: reportDetails.find((r) => r.depositId === deposit.depositId)
          ?.data,
      }
    })
    setReportStatuses(statusMap)
  }

  const applyPageResponse = async (
    response: BridgeDepositsResponse,
    nextPageIndex: number,
    replaceCursors: boolean
  ) => {
    if (!response.bridgeDeposits?.edges) {
      throw new Error('Invalid response from GraphQL')
    }

    const formattedDeposits = mapDeposits(response)
    setDeposits(formattedDeposits)
    setPageInfo(response.bridgeDeposits.pageInfo)

    const cursors: PageCursors = {
      startCursor: response.bridgeDeposits.pageInfo.startCursor,
      endCursor: response.bridgeDeposits.pageInfo.endCursor,
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
    await loadReportStatuses(formattedDeposits)
  }

  const fetchPage = useCallback(
    async (after: string | null | undefined, size: number) => {
      return graphqlQuery<BridgeDepositsResponse>(GET_BRIDGE_DEPOSITS, {
        first: size,
        ...(after ? { after } : {}),
        orderBy: ['DEPOSIT_ID_DESC'],
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
        await applyPageResponse(response, 0, true)
      } catch (err) {
        console.error('Error fetching deposits:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to fetch data. Please check your network connection and try again.'
        )
        setDeposits([])
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
        await applyPageResponse(response, 0, true)
      } else {
        const prevPageCursors = pagesCursorsRef.current[prevPageIndex - 1]
        if (!prevPageCursors?.endCursor) {
          const response = await fetchPage(null, pageSize)
          await applyPageResponse(response, 0, true)
        } else {
          const response = await fetchPage(prevPageCursors.endCursor, pageSize)
          await applyPageResponse(response, prevPageIndex, false)
        }
      }
    } catch (err) {
      console.error('Error fetching previous deposits page:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch previous page. Please try again.'
      )
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
      await applyPageResponse(response, pageIndex + 1, false)
    } catch (err) {
      console.error('Error fetching next deposits page:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch next page. Please try again.'
      )
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
        <title>Bridge Deposits | Tellor Explorer</title>
        <meta name="description" content="View Bridge Deposits" />
      </Head>
      <main>
        <HStack h="24px" mb={2}>
          <Heading size={'md'}>Bridge Deposits</Heading>
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
          <Text>Bridge Deposits</Text>
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
          {loading && deposits.length === 0 ? (
            <Center py={10}>
              <Spinner size="xl" />
            </Center>
          ) : error && deposits.length === 0 ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : deposits.length === 0 ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription>No deposits found.</AlertDescription>
            </Alert>
          ) : (
            <>
              <Box overflowX="auto" maxW="100%" width="100%" opacity={loading ? 0.6 : 1}>
                <Table variant="simple" width="100%">
                  <Thead>
                    <Tr>
                      <Th>Type</Th>
                      <Th>ID</Th>
                      <Th>Sender</Th>
                      <Th>Recipient</Th>
                      <Th isNumeric>Amount (TRB)</Th>
                      <Th>Time</Th>
                      <Th>Reported</Th>
                      <Th>Claimed</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {deposits.map((deposit) => (
                      <Tr key={`deposit-${deposit.depositId}`}>
                        <Td>
                          <Text color="blue.500">Deposit</Text>
                        </Td>
                        <Td>{deposit.depositId}</Td>
                        <Td>
                          <Tooltip
                            label="Click to copy address"
                            placement="top"
                            hasArrow
                          >
                            <HStack
                              spacing={1}
                              cursor="pointer"
                              onClick={() => copyToClipboard(deposit.sender)}
                              _hover={{ color: 'blue.500' }}
                            >
                              <Text
                                isTruncated
                                maxW="150px"
                                title={deposit.sender}
                              >
                                {deposit.sender}
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
                              onClick={() => copyToClipboard(deposit.recipient)}
                              _hover={{ color: 'blue.500' }}
                            >
                              <Text
                                isTruncated
                                maxW="150px"
                                title={deposit.recipient}
                              >
                                {deposit.recipient}
                              </Text>
                              <Icon as={FiCopy} boxSize={3} opacity={0.7} />
                            </HStack>
                          </Tooltip>
                        </Td>
                        <Td isNumeric>{formatEther(deposit.amount)}</Td>
                        <Td>
                          <Tooltip
                            label={
                              deposit.blockHeight
                                ? `Block #${deposit.blockHeight.toString()}`
                                : 'Block height not available'
                            }
                            placement="top"
                            hasArrow
                          >
                            <Text>{formatDate(deposit.blockTimestamp)}</Text>
                          </Tooltip>
                        </Td>
                        <Td>
                          {deposit.reported ? (
                            reportStatuses[deposit.depositId]?.data ? (
                              <Tooltip
                                label={
                                  <Box>
                                    <Text>
                                      Aggregate Power:{' '}
                                      {
                                        reportStatuses[deposit.depositId].data
                                          ?.aggregate?.aggregate_power
                                      }
                                    </Text>
                                    <Text>
                                      Date:{' '}
                                      {formatDate(
                                        new Date(
                                          Number(
                                            reportStatuses[deposit.depositId]
                                              .data?.timestamp
                                          )
                                        )
                                      )}
                                    </Text>
                                  </Box>
                                }
                                placement="top"
                                hasArrow
                              >
                                <Text color="green.500">True</Text>
                              </Tooltip>
                            ) : (
                              <Text color="green.500">True</Text>
                            )
                          ) : (
                            <Text color="red.500">False</Text>
                          )}
                        </Td>
                        <Td>
                          {deposit.claimed ? (
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
