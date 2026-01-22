import { useState, useEffect } from 'react'
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
} from '@chakra-ui/react'
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

export default function BridgeDeposits() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [reportStatuses, setReportStatuses] = useState<
    Record<number, ReportStatus>
  >({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  // Fetch detailed report data for tooltip (optional - only for deposits that are reported)
  const fetchReportDetails = async (depositId: number) => {
    try {
      const queryId = generateDepositQueryId(depositId)
      
      const response = await graphqlQuery<AggregateReportsResponse>(
        GET_AGGREGATE_REPORTS_BY_QUERY_ID,
        { 
          queryId: queryId,
          first: 1 // Get latest report for this queryId
        }
      )

      // If no reports found, return empty
      if (!response.aggregateReports.edges.length) {
        return null
      }

      const latestReport = response.aggregateReports.edges[0].node
      const hasValidData = latestReport.value && latestReport.value.length > 0

      if (!hasValidData) {
        return null
      }

      // Transform GraphQL response to match expected structure
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
    } catch (error) {
      console.error(
        `Error fetching report details for deposit ${depositId}:`,
        error
      )
      return null
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        setLoading(true)

        // Fetch deposits from GraphQL
        const response = await graphqlQuery<BridgeDepositsResponse>(
          GET_BRIDGE_DEPOSITS,
          {
            first: 1000, // Fetch a large number, can add pagination later if needed
            orderBy: ['DEPOSIT_ID_DESC'],
          }
        )

        if (!response.bridgeDeposits?.edges) {
          throw new Error('Invalid response from GraphQL')
        }

        // Transform GraphQL deposits to our Deposit format
        const formattedDeposits: Deposit[] = response.bridgeDeposits.edges.map(
          (edge) => {
            const node = edge.node
            // Convert timestamp from BigFloat (Unix timestamp) to Date
            const timestamp = new Date(Number(node.timestamp) * 1000)
            
            return {
              id: node.depositId, // Use depositId as the id for consistency
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
          }
        )

        setDeposits(formattedDeposits)

        // Fetch detailed report data for reported deposits (for tooltips)
        // Only fetch for deposits that are reported to avoid unnecessary queries
        const reportedDeposits = formattedDeposits.filter((d) => d.reported)
        const reportDetails = await Promise.all(
          reportedDeposits.map((deposit) =>
            fetchReportDetails(deposit.depositId).then((data) => ({
              depositId: deposit.depositId,
              data,
            }))
          )
        )

        // Build report status map
        const statusMap: Record<number, ReportStatus> = {}
        formattedDeposits.forEach((deposit) => {
          statusMap[deposit.depositId] = {
            isReported: deposit.reported,
            data: reportDetails.find((r) => r.depositId === deposit.depositId)
              ?.data,
          }
        })

        setReportStatuses(statusMap)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to fetch data. Please check your network connection and try again.'
        )
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Helper function to format the date
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

  // Helper function to format aggregate power (add this near your other helper functions)
  const formatAggregatePower = (power: string | undefined) => {
    if (!power) return '0'
    return (Number(power) / 1_000_000).toString()
  }

  // Helper function to format the report data for tooltip
  const formatReportData = (data: any) => {
    if (!data?.aggregate) return ''

    const timestamp = new Date(Number(data.timestamp))
    return `Aggregate Power: ${
      data.aggregate.aggregate_power
    }\n\nDate: ${formatDate(timestamp)}`
  }

  // Deposits are already sorted by deposit ID descending from GraphQL
  const sortedDeposits = deposits

  // Add this new function for copying addresses
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
        <HStack h="24px" mb={8}>
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

        <Box
          bg={useColorModeValue('light-container', 'dark-container')}
          borderRadius="lg"
          boxShadow="xl"
          p={6}
        >
          {loading ? (
            <Center py={10}>
              <Spinner size="xl" />
            </Center>
          ) : error ? (
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
            <Box overflowX="auto" maxW="100%" width="100%">
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
                  {sortedDeposits.map((deposit) => (
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
                            <Text isTruncated maxW="150px" title={deposit.sender}>
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
                            <Text isTruncated maxW="150px" title={deposit.recipient}>
                              {deposit.recipient}
                            </Text>
                            <Icon as={FiCopy} boxSize={3} opacity={0.7} />
                          </HStack>
                        </Tooltip>
                      </Td>
                      <Td isNumeric>
                        {formatEther(deposit.amount)}
                      </Td>
                      <Td>
                        <Tooltip
                          label={deposit.blockHeight ? `Block #${deposit.blockHeight.toString()}` : 'Block height not available'}
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
                                          reportStatuses[deposit.depositId].data
                                            ?.timestamp
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
          )}
        </Box>
      </main>
    </>
  )
}
