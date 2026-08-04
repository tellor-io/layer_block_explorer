import {
  Box,
  Divider,
  HStack,
  Heading,
  Icon,
  Link,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableContainer,
  Tabs,
  Tag,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
  Spinner,
  Center,
} from '@chakra-ui/react'
import { FiChevronRight, FiHome } from 'react-icons/fi'
import NextLink from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  getAccount,
  getAllBalances,
  getBalanceStaked,
} from '@/rpc/query'
import { selectTmClient } from '@/store/connectSlice'
import { Account, Coin } from '@cosmjs/stargate'
import { trimHash, getTypeMsg } from '@/utils/helper'
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_TRANSACTIONS_BY_ACCOUNT } from '@/datasources/graphql/queries'
import { TransactionsResponse, Transaction } from '@/datasources/graphql/types'

export default function DetailAccount() {
  const router = useRouter()
  const toast = useToast()
  const { address } = router.query
  const tmClient = useSelector(selectTmClient)
  const [account, setAccount] = useState<Account | null>(null)
  const [allBalances, setAllBalances] = useState<readonly Coin[]>([])
  const [balanceStaked, setBalanceStaked] = useState<Coin | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(true)
  const [txError, setTxError] = useState<string | null>(null)

  const fetchAccountTransactions = async () => {
    if (!address) return
    
    try {
      setTxLoading(true)
      setTxError(null)
      
      const response = await graphqlQuery<TransactionsResponse>(
        GET_TRANSACTIONS_BY_ACCOUNT,
        { address: address as string, first: 30 }
      )
      
      if (response.transactions?.edges) {
        const txs = response.transactions.edges.map(edge => edge.node)
        setTransactions(txs)
      }
    } catch (err) {
      console.error('Failed to fetch account transactions:', err)
      setTxError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setTxLoading(false)
    }
  }

  useEffect(() => {
    if (tmClient && address) {
      if (!account) {
        getAccount(tmClient, address as string)
          .then(setAccount)
          .catch(showError)
      }

      if (!allBalances.length) {
        getAllBalances(tmClient, address as string)
          .then(setAllBalances)
          .catch(showError)
      }

      if (!balanceStaked) {
        getBalanceStaked(tmClient, address as string)
          .then(setBalanceStaked)
          .catch(showError)
      }

      fetchAccountTransactions()
    }
  }, [tmClient, account, allBalances, balanceStaked, address])

  const showError = (err: Error) => {
    const errMsg = err.message
    let error = null
    try {
      error = JSON.parse(errMsg)
    } catch (e) {
      error = {
        message: 'Invalid',
        data: errMsg,
      }
    }

    toast({
      title: error.message,
      description: error.data,
      status: 'error',
      duration: 5000,
      isClosable: true,
    })
  }

  const renderTransactionType = (txData: string) => {
    // For now, just show a generic transaction tag
    // In a real implementation, you might decode the txData to determine the message type
    return (
      <HStack>
        <Tag colorScheme="cyan">Transaction</Tag>
      </HStack>
    )
  }

  return (
    <>
      <Head>
        <title>Detail Account | Tellor Explorer</title>
        <meta name="description" content="Account | Tellor Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Account</Heading>
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
          <Text>Accounts</Text>
          <Icon fontSize="16" as={FiChevronRight} />
          <Text>Detail</Text>
        </HStack>
        <Box
          mt={8}
          bg={useColorModeValue('light-container', 'dark-container')}
          border="1px solid" borderColor={useColorModeValue('border.light', 'border.dark')}
          borderRadius="2xl"
          p={4}
        >
          <Heading size={'md'} mb={4}>
            Profile
          </Heading>
          <Divider borderColor={'gray'} mb={4} />
          <TableContainer>
            <Table variant="unstyled" size={'sm'}>
              <Tbody>
                <Tr>
                  <Td pl={0} width={150}>
                    <b>Address</b>
                  </Td>
                  <Td>{address}</Td>
                </Tr>
                <Tr>
                  <Td pl={0} width={150}>
                    <b>Pub Key</b>
                  </Td>
                  <Td>
                    <Tabs>
                      <TabList>
                        <Tab>@Type</Tab>
                        <Tab>Key</Tab>
                      </TabList>
                      <TabPanels>
                        <TabPanel>
                          <p>{account?.pubkey?.type}</p>
                        </TabPanel>
                        <TabPanel>
                          <p>{account?.pubkey?.value}</p>
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  </Td>
                </Tr>
                <Tr>
                  <Td pl={0} width={150}>
                    <b>Account Number</b>
                  </Td>
                  <Td>{account?.accountNumber}</Td>
                </Tr>
                <Tr>
                  <Td pl={0} width={150}>
                    <b>Sequence</b>
                  </Td>
                  <Td>{account?.sequence}</Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
        </Box>

        <Box
          mt={8}
          bg={useColorModeValue('light-container', 'dark-container')}
          border="1px solid" borderColor={useColorModeValue('border.light', 'border.dark')}
          borderRadius="2xl"
          p={4}
        >
          <Heading size={'md'} mb={4}>
            Balances
          </Heading>
          <Heading size={'sm'} mb={4}></Heading>
          <Tabs size="md">
            <TabList>
              <Tab>Available</Tab>
              <Tab>Delegated</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Denom</Th>
                        <Th>Amount</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {allBalances.map((item, index) => (
                        <Tr key={index}>
                          <Td>{item.denom}</Td>
                          <Td>{item.amount}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </TabPanel>
              <TabPanel>
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Denom</Th>
                        <Th>Amount</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td>{balanceStaked?.denom}</Td>
                        <Td>{balanceStaked?.amount}</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        <Box
          mt={8}
          bg={useColorModeValue('light-container', 'dark-container')}
          border="1px solid" borderColor={useColorModeValue('border.light', 'border.dark')}
          borderRadius="2xl"
          p={4}
        >
          <Heading size={'md'} mb={4}>
            Transactions
          </Heading>
          <Divider borderColor={'gray'} mb={4} />
          {txLoading ? (
            <Center py={8}>
              <Spinner size="lg" />
            </Center>
          ) : txError ? (
            <Center py={8}>
              <Text color="red.500">Error: {txError}</Text>
            </Center>
          ) : (
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Tx Hash</Th>
                    <Th>Type</Th>
                    <Th>Value</Th>
                    <Th>Height</Th>
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
                          <Text
                            color={useColorModeValue('light-theme', 'dark-theme')}
                          >
                            {trimHash(tx.id)}
                          </Text>
                        </Link>
                      </Td>
                      <Td>{renderTransactionType(tx.txData)}</Td>
                      <Td>{tx.blockHeight}</Td>
                      <Td>
                        <Link
                          as={NextLink}
                          href={'/blocks/' + tx.blockHeight}
                          style={{ textDecoration: 'none' }}
                          _focus={{ boxShadow: 'none' }}
                        >
                          <Text
                            color={useColorModeValue('light-theme', 'dark-theme')}
                          >
                            {tx.blockHeight}
                          </Text>
                        </Link>
                      </Td>
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
