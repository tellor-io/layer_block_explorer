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
import Head from 'next/head'
import NextLink from 'next/link'
import { FiHome, FiChevronRight, FiCopy } from 'react-icons/fi'
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_WITHDRAWALS } from '@/datasources/graphql/queries'
import type { WithdrawalsResponse, Withdraw } from '@/datasources/graphql/types'

export default function BridgeWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdraw[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()


  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)

        // Fetch withdrawals from GraphQL
        const response = await graphqlQuery<WithdrawalsResponse>(
          GET_WITHDRAWALS,
          {
            first: 1000, // Get a large number of withdrawals
            orderBy: ['BLOCK_HEIGHT_DESC']
          }
        )

        if (!response.withdraws.edges.length) {
          setWithdrawals([])
          setLoading(false)
          return
        }

        const withdrawalsData = response.withdraws.edges.map(edge => edge.node)
        setWithdrawals(withdrawalsData)

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
        <title>Bridge Withdrawals | Tellor Explorer</title>
        <meta name="description" content="View Bridge Withdrawals" />
      </Head>
      <main>
        <HStack h="24px" mb={8}>
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
          ) : withdrawals.length === 0 ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription>No withdrawals found.</AlertDescription>
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
                            onClick={() => copyToClipboard(withdrawal.sender)}
                            _hover={{ color: 'blue.500' }}
                          >
                            <Text isTruncated maxW="150px" title={withdrawal.sender}>
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
                            onClick={() => copyToClipboard(withdrawal.recipient)}
                            _hover={{ color: 'blue.500' }}
                          >
                            <Text isTruncated maxW="150px" title={withdrawal.recipient}>
                              {withdrawal.recipient}
                            </Text>
                            <Icon as={FiCopy} boxSize={3} opacity={0.7} />
                          </HStack>
                        </Tooltip>
                      </Td>
                      <Td isNumeric>
                        {(Number(withdrawal.amount) / 1_000_000).toLocaleString()}
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
                                ? new Date(withdrawal.withdrawalInitiatedTimestamp)
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
          )}
        </Box>
      </main>
    </>
  )
}

