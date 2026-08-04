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
  Spinner,
  Center,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { FiChevronRight, FiHome } from 'react-icons/fi'
import { timeFromNow, trimHash, getTypeMsg } from '@/utils/helper'
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_TRANSACTIONS } from '@/datasources/graphql/queries'
import { TransactionsResponse, Transaction } from '@/datasources/graphql/types'

const MAX_ROWS = 50

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerBg = useColorModeValue('light-container', 'dark-container')
  const txHashColor = useColorModeValue('light-theme', 'dark-theme')

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await graphqlQuery<TransactionsResponse>(
        GET_TRANSACTIONS,
        { first: MAX_ROWS }
      )
      
      if (response.transactions?.edges) {
        const txs = response.transactions.edges.map(edge => edge.node)
        setTransactions(txs)
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }

  const renderMessages = (txData: string) => {
    try {
      if (!txData) {
        return <Text>No data</Text>
      }

      // Try to decode the transaction data if it's base64 encoded
      try {
        // For now, just show that we have transaction data
        // In a real implementation, you might want to decode the txData
        return <Tag colorScheme="cyan">Transaction</Tag>
      } catch (decodeError) {
        console.error('Failed to decode transaction:', decodeError)
        return <Text>Error decoding</Text>
      }
    } catch (error) {
      console.error('Error rendering message:', error)
      return <Text>Error</Text>
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

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

        <Box
          mt={8}
          bg={containerBg}
          border="1px solid" borderColor={useColorModeValue('border.light', 'border.dark')}
          borderRadius="2xl"
          p={4}
          overflowX="auto"
        >
          {loading ? (
            <Center py={8}>
              <Spinner size="lg" />
            </Center>
          ) : error ? (
            <Center py={8}>
              <Text color="red.500">Error: {error}</Text>
            </Center>
          ) : (
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Tx Hash</Th>
                    <Th>Height</Th>
                    <Th>Messages</Th>
                    <Th>Time</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {transactions.map((tx) => (
                    <Tr key={tx.id}>
                      <Td>
                        <Link
                          as={NextLink}
                          href={'/txs/' + tx.id.toUpperCase()}
                          style={{ textDecoration: 'none' }}
                          _focus={{ boxShadow: 'none' }}
                        >
                          <Text color={txHashColor}>
                            {trimHash(tx.id)}
                          </Text>
                        </Link>
                      </Td>
                      <Td>
                        <Link
                          as={NextLink}
                          href={'/blocks/' + tx.blockHeight}
                          style={{ textDecoration: 'none' }}
                          _focus={{ boxShadow: 'none' }}
                        >
                          <Text color={txHashColor}>{tx.blockHeight}</Text>
                        </Link>
                      </Td>
                      <Td>{renderMessages(tx.txData)}</Td>
                      <Td>{timeFromNow(tx.timestamp)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </main>
    </>
  )
}
