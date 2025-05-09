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
  id: number;
  sender: string;
  recipient: string;
  amount: string;
  tip: string;
  blockHeight: string;
  blockTimestamp?: string;
}

export default function BridgeDeposits() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [reportStatuses, setReportStatuses] = useState<
    Record<number, ReportStatus>
  >({})
  const [claimStatuses, setClaimStatuses] = useState<
    Record<number, ClaimStatus>
  >({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  // Function to fetch report status for a deposit
  const fetchReportStatus = async (depositId: number) => {
    try {
      const queryId = generateDepositQueryId(depositId)
      const response = await fetch(`/api/oracle-data/${queryId}`)

      if (!response.ok) {
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

  // Function to fetch claim status for a deposit
  const fetchClaimStatus = async (depositId: number) => {
    try {
      const rpcManager = RPCManager.getInstance()
      const endpoint = await rpcManager.getCurrentEndpoint()
      const baseEndpoint = endpoint.replace('/rpc', '')

      const response = await fetch(
        `${baseEndpoint}/layer/bridge/get_deposit_claimed/${depositId}`
      )

      if (!response.ok) {
        throw new Error(`External API responded with status: ${response.status}`)
      }

      const data = await response.json()
      return { claimed: data.claimed }
    } catch (error) {
      console.error(
        `Error fetching claim status for deposit ${depositId}:`,
        error
      )
      return { claimed: false }
    }
  }

  // Function to fetch withdrawal claim status
  const fetchWithdrawalClaimStatus = async (withdrawalId: number) => {
    try {
      const response = await fetch(
        `/api/ethereum/bridge?method=withdrawClaimed&id=${withdrawalId}`
      )
      if (!response.ok) {
        throw new Error(`External API responded with status: ${response.status}`)
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

  // Function to fetch withdrawals
  const fetchWithdrawals = async () => {
    try {
      const rpcManager = RPCManager.getInstance()
      const endpoint = await rpcManager.getCurrentEndpoint()
      const baseEndpoint = endpoint.replace('/rpc', '')

      const response = await fetch(
        `${baseEndpoint}/layer/bridge/get_last_withdrawal_id`
      )
      if (!response.ok) {
        throw new Error(`External API responded with status: ${response.status}`)
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
    }
  }

  // Function to fetch individual withdrawal data
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
        throw new Error(`External API responded with status: ${response.status}`)
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)

        // Fetch deposits using new API endpoint
        const response = await fetch('/api/ethereum/bridge?method=deposits')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const { deposits } = await response.json()
        if (!Array.isArray(deposits)) {
          throw new Error('Expected deposits to be an array')
        }

        const formattedDeposits: Deposit[] = deposits.map((deposit: APIDeposit) => ({
          ...deposit,
          amount: BigInt(deposit.amount),
          tip: BigInt(deposit.tip),
          blockHeight: BigInt(deposit.blockHeight),
          blockTimestamp: deposit.blockTimestamp ? new Date(deposit.blockTimestamp) : undefined,
        }))

        setDeposits(formattedDeposits)

        // Fetch report statuses and claim statuses for all deposits
        const [statuses, claims] = await Promise.all([
          Promise.all(
            formattedDeposits.map((deposit) => fetchReportStatus(deposit.id))
          ),
          Promise.all(
            formattedDeposits.map((deposit) => fetchClaimStatus(deposit.id))
          ),
        ])

        const statusMap: Record<number, ReportStatus> = {}
        const claimMap: Record<number, ClaimStatus> = {}

        formattedDeposits.forEach((deposit, index) => {
          statusMap[deposit.id] = statuses[index]
          claimMap[deposit.id] = claims[index]
        })

        setReportStatuses(statusMap)
        setClaimStatuses(claimMap)

        // Fetch withdrawals
        await fetchWithdrawals()

        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError(
          'Failed to fetch data. Please check your network connection and try again.'
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
