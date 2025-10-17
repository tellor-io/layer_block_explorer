import { useState, useEffect } from 'react'
import {
  Box,
  Container,
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
import {
  type Deposit as BridgeDeposit,
  generateDepositQueryId,
  generateWithdrawalQueryId,
} from '@/utils/bridgeContract'
import { formatEther } from 'ethers'
import Head from 'next/head'
import NextLink from 'next/link'
import { FiHome, FiChevronRight, FiCopy } from 'react-icons/fi'
import { ethers } from 'ethers'
import { RPCManager } from '@/utils/rpcManager'
import { useGraphQLData } from '@/hooks/useGraphQLData'
import {
  GET_BRIDGE_DEPOSITS_PAGINATED,
  GET_WITHDRAWS_PAGINATED,
} from '@/graphql/queries/bridge'

interface ReportStatus {
  isReported: boolean
  data?: any
}

interface Deposit extends BridgeDeposit {
  blockTimestamp?: Date
}

interface ClaimStatus {
  claimed: boolean
}

interface WithdrawalClaimStatus {
  claimed: boolean
}

interface Withdrawal {
  id: number
  sender: string
  recipient: string
  amount: bigint
  blockHeight: bigint
  blockTimestamp?: Date
  reported: boolean
  reportData?: any
  claimed: boolean
}

interface APIDeposit {
  id: number
  sender: string
  recipient: string
  amount: string
  tip: string
  blockHeight: string
  blockTimestamp?: string
}

export default function BridgeDeposits() {
  const [reportStatuses, setReportStatuses] = useState<
    Record<number, ReportStatus>
  >({})
  const [claimStatuses, setClaimStatuses] = useState<
    Record<number, ClaimStatus>
  >({})
  const toast = useToast()

  // GraphQL data fetching for deposits
  const {
    data: depositsData,
    loading: depositsLoading,
    error: depositsError,
    refetch: refetchDeposits,
  } = useGraphQLData(GET_BRIDGE_DEPOSITS_PAGINATED, {
    limit: 100,
    offset: 0,
  })

  // State for RPC-based withdrawal data
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false)
  const [withdrawalsError, setWithdrawalsError] = useState<string | null>(null)

  // Transform GraphQL data to match existing interface
  const deposits: Deposit[] =
    depositsData?.bridgeDeposits?.map((deposit: any) => ({
      id: deposit.depositId,
      sender: deposit.sender,
      recipient: deposit.recipient,
      amount: BigInt(deposit.amount),
      tip: BigInt(deposit.tip || '0'),
      blockHeight: BigInt(deposit.blockHeight || '0'),
      blockTimestamp: deposit.timestamp
        ? new Date(Number(deposit.timestamp) * 1000)
        : undefined,
    })) || []

  const loading = depositsLoading || withdrawalsLoading
  const error = depositsError || withdrawalsError

  // Function to fetch report status for a deposit
  const fetchReportStatus = async (depositId: number) => {
    try {
      const queryId = generateDepositQueryId(depositId)
      const rpcManager = RPCManager.getInstance()
      const currentEndpoint = await rpcManager.getCurrentEndpoint()
      const response = await fetch(
        `/api/oracle-data/${queryId}?endpoint=${encodeURIComponent(
          currentEndpoint
        )}`
      )

      if (!response.ok) {
        console.warn(
          `Failed to fetch report status for deposit ${depositId}: ${response.status}`
        )
        return { isReported: false }
      }

      const data = await response.json()
      const hasValidData =
        data && data.aggregate && data.aggregate.aggregate_value
      return {
        isReported: hasValidData,
        data: hasValidData ? data : undefined,
      }
    } catch (error) {
      console.error(
        `Error fetching report status for deposit ${depositId}:`,
        error
      )
      return { isReported: false }
    }
  }

  // Function to fetch claim status for a deposit with retry logic
  const fetchClaimStatus = async (depositId: number) => {
    const maxRetries = 3
    const retryDelay = 1000 // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const rpcManager = RPCManager.getInstance()
        const endpoint = await rpcManager.getCurrentEndpoint()
        const baseEndpoint = endpoint.replace('/rpc', '')

        const response = await fetch(
          `${baseEndpoint}/layer/bridge/get_deposit_claimed/${depositId}`,
          {
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(10000), // 10 second timeout
          }
        )

        if (!response.ok) {
          if (attempt === maxRetries) {
            throw new Error(
              `External API responded with status: ${response.status}`
            )
          }
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
          continue
        }

        const data = await response.json()

        // Check if the response has the expected structure
        if (typeof data.claimed === 'boolean') {
          return { claimed: data.claimed }
        } else if (typeof data === 'boolean') {
          return { claimed: data }
        } else {
          console.warn(
            `Unexpected claim status format for deposit ${depositId}:`,
            data
          )
          return { claimed: false }
        }
      } catch (error) {
        if (attempt === maxRetries) {
          // On final attempt, return false instead of throwing
          return { claimed: false }
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }
    }

    return { claimed: false }
  }

  // Function to fetch withdrawal claim status
  const fetchWithdrawalClaimStatus = async (withdrawalId: number) => {
    try {
      const rpcManager = RPCManager.getInstance()
      const currentEndpoint = await rpcManager.getCurrentEndpoint()
      const response = await fetch(
        `/api/ethereum/bridge?method=withdrawClaimed&id=${withdrawalId}&endpoint=${encodeURIComponent(
          currentEndpoint
        )}`
      )
      if (!response.ok) {
        console.warn(
          `Failed to fetch withdrawal claim status for ID ${withdrawalId}: ${response.status}`
        )
        return { claimed: false }
      }
      const data = await response.json()
      return { claimed: data.claimed }
    } catch (error) {
      console.error(
        `Error fetching withdrawal claim status for ID ${withdrawalId}:`,
        error
      )
      return { claimed: false }
    }
  }

  // Function to fetch withdrawals using RPC (for timestamps and report data)
  const fetchWithdrawals = async () => {
    try {
      setWithdrawalsLoading(true)
      setWithdrawalsError(null)

      const rpcManager = RPCManager.getInstance()
      const endpoint = await rpcManager.getCurrentEndpoint()
      const baseEndpoint = endpoint.replace('/rpc', '')

      const response = await fetch(
        `${baseEndpoint}/layer/bridge/get_last_withdrawal_id`
      )
      if (!response.ok) {
        throw new Error(
          `External API responded with status: ${response.status}`
        )
      }
      const data = await response.json()
      const lastWithdrawalId = Number(data.withdrawal_id)

      const withdrawalPromises = []
      const claimStatusPromises = []
      for (let i = 1; i <= lastWithdrawalId; i++) {
        withdrawalPromises.push(fetchWithdrawalData(i))
        claimStatusPromises.push(fetchWithdrawalClaimStatus(i))
      }

      const [withdrawals, claimStatuses] = await Promise.all([
        Promise.all(withdrawalPromises),
        Promise.all(claimStatusPromises),
      ])

      const filteredWithdrawals = withdrawals.filter(
        (w): w is NonNullable<typeof w> => w !== null
      )
      const combinedWithdrawals = filteredWithdrawals.map(
        (withdrawal, index) => ({
          ...withdrawal,
          claimed: claimStatuses[index].claimed,
        })
      ) as Withdrawal[]

      setWithdrawals(combinedWithdrawals)
    } catch (error) {
      console.error('Error fetching withdrawals:', error)
      setWithdrawalsError('Failed to fetch withdrawal data')
    } finally {
      setWithdrawalsLoading(false)
    }
  }

  // Function to fetch individual withdrawal data with full RPC details
  const fetchWithdrawalData = async (withdrawalId: number) => {
    try {
      const rpcManager = RPCManager.getInstance()
      const endpoint = await rpcManager.getCurrentEndpoint()
      const baseEndpoint = endpoint.replace('/rpc', '')

      const queryId = generateWithdrawalQueryId(withdrawalId)
      const response = await fetch(
        `${baseEndpoint}/tellor-io/layer/oracle/get_current_aggregate_report/${queryId}`
      )

      if (!response.ok) {
        throw new Error(
          `External API responded with status: ${response.status}`
        )
      }

      const data = await response.json()
      const encodedData = data.aggregate?.aggregate_value
      if (!encodedData) {
        throw new Error('No aggregate value found')
      }

      const sender = '0x' + encodedData.slice(0, 64).slice(-40)
      const amountHex = encodedData.slice(128, 192)
      const rawAmount = BigInt('0x' + amountHex.replace(/^0+/, ''))
      const amount = rawAmount * BigInt(10 ** 14)

      const recipientLength = parseInt(encodedData.slice(256, 320), 16)
      const recipientStart = 320
      const recipient = Buffer.from(
        encodedData.slice(recipientStart, recipientStart + recipientLength * 2),
        'hex'
      ).toString('utf8')

      return {
        id: withdrawalId,
        sender,
        recipient,
        amount,
        blockHeight: BigInt(data.aggregate?.height || '0'),
        blockTimestamp: new Date(Number(data.timestamp)),
        reported: true,
        reportData: data,
        claimed: false,
      }
    } catch (error) {
      console.error(`Error fetching withdrawal ${withdrawalId}:`, error)
      return null
    }
  }

  // Fetch report statuses and claim statuses when deposits change
  useEffect(() => {
    const fetchStatuses = async () => {
      if (deposits.length === 0) return

      try {
        // Fetch report statuses and claim statuses for all deposits
        const [statuses, claims] = await Promise.all([
          Promise.all(deposits.map((deposit) => fetchReportStatus(deposit.id))),
          Promise.all(deposits.map((deposit) => fetchClaimStatus(deposit.id))),
        ])

        const statusMap: Record<number, ReportStatus> = {}
        const claimMap: Record<number, ClaimStatus> = {}

        deposits.forEach((deposit, index) => {
          statusMap[deposit.id] = statuses[index]
          claimMap[deposit.id] = claims[index]
        })

        setReportStatuses(statusMap)
        setClaimStatuses(claimMap)
      } catch (error) {
        console.error('Error fetching statuses:', error)
      }
    }

    fetchStatuses()
  }, [deposits])

  // Fetch withdrawals on component mount
  useEffect(() => {
    fetchWithdrawals()
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

  // Combine and sort all transactions
  const allTransactions = [...deposits, ...withdrawals].sort(
    (a, b) => Number(b.blockHeight) - Number(a.blockHeight)
  )

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
              <AlertDescription>
                Failed to fetch bridge data.{' '}
                {typeof error === 'string'
                  ? error
                  : error?.message || 'Please try again later.'}
              </AlertDescription>
            </Alert>
          ) : deposits.length === 0 && withdrawals.length === 0 ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription>No bridge transactions found.</AlertDescription>
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
                  {allTransactions.map((tx) => (
                    <Tr
                      key={`${'tip' in tx ? 'deposit' : 'withdrawal'}-${tx.id}`}
                    >
                      <Td>
                        <Text color={'tip' in tx ? 'blue.500' : 'green.500'}>
                          {'tip' in tx ? 'Deposit' : 'Withdrawal'}
                        </Text>
                      </Td>
                      <Td>{tx.id}</Td>
                      <Td>
                        <Tooltip
                          label="Click to copy address"
                          placement="top"
                          hasArrow
                        >
                          <HStack
                            spacing={1}
                            cursor="pointer"
                            onClick={() => copyToClipboard(tx.sender)}
                            _hover={{ color: 'blue.500' }}
                          >
                            <Text isTruncated maxW="150px" title={tx.sender}>
                              {tx.sender}
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
                            onClick={() => copyToClipboard(tx.recipient)}
                            _hover={{ color: 'blue.500' }}
                          >
                            <Text isTruncated maxW="150px" title={tx.recipient}>
                              {tx.recipient}
                            </Text>
                            <Icon as={FiCopy} boxSize={3} opacity={0.7} />
                          </HStack>
                        </Tooltip>
                      </Td>
                      <Td isNumeric>
                        {'tip' in tx
                          ? formatEther(tx.amount)
                          : formatEther(tx.amount / BigInt(100))}
                      </Td>
                      <Td>
                        <Tooltip
                          label={`Block #${tx.blockHeight.toString()}`}
                          placement="top"
                          hasArrow
                        >
                          <Text>{formatDate(tx.blockTimestamp)}</Text>
                        </Tooltip>
                      </Td>
                      <Td>
                        {'tip' in tx ? (
                          reportStatuses[tx.id]?.isReported ? (
                            <Tooltip
                              label={
                                <Box>
                                  <Text>
                                    Aggregate Power:{' '}
                                    {
                                      reportStatuses[tx.id].data?.aggregate
                                        ?.aggregate_power
                                    }
                                  </Text>
                                  <Text>
                                    Date:{' '}
                                    {formatDate(
                                      new Date(
                                        Number(
                                          reportStatuses[tx.id].data?.timestamp
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
                            <Text color="red.500">False</Text>
                          )
                        ) : tx.reported ? (
                          <Tooltip
                            label={
                              <Box>
                                <Text>
                                  Aggregate Power:{' '}
                                  {formatAggregatePower(
                                    tx.reportData?.aggregate?.aggregate_power
                                  )}
                                </Text>
                                <Text>
                                  Date: {formatDate(tx.blockTimestamp)}
                                </Text>
                              </Box>
                            }
                            placement="top"
                            hasArrow
                          >
                            <Text color="green.500">True</Text>
                          </Tooltip>
                        ) : (
                          <Text color="red.500">False</Text>
                        )}
                      </Td>
                      <Td>
                        {'tip' in tx ? (
                          claimStatuses[tx.id]?.claimed ? (
                            <Text color="green.500">True</Text>
                          ) : (
                            <Text color="red.500">False</Text>
                          )
                        ) : tx.claimed ? (
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
