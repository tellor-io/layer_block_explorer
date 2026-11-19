import {
  Box,
  Button,
  Divider,
  Flex,
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
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  getAccount,
  getAllBalances,
  getBalanceStaked,
} from '@/rpc/query'
import { selectTmClient } from '@/store/connectSlice'
import { Account, Coin } from '@cosmjs/stargate'
import { trimHash, getTypeMsg, toAccountAddress, isValidBech32Address } from '@/utils/helper'
import ValidatorOperatorView from '@/components/ValidatorOperatorView'
import { fetchAccountTransactions } from '@/datasources/indexer/client'
import { PageInfo, Transaction } from '@/datasources/graphql/types'

// How many transactions each request for an account's history returns
const ACCOUNT_TX_PAGE_SIZE = 30

export default function DetailAccount() {
  const router = useRouter()
  const toast = useToast()
  const { address } = router.query
  const routeAddress = typeof address === 'string' ? address : ''
  const addressIsValid = !routeAddress || isValidBech32Address(routeAddress)
  const isOperator = addressIsValid && routeAddress.startsWith('tellorvaloper1')
  const accountAddress = useMemo(() => {
    if (!isOperator) return routeAddress
    try {
      return toAccountAddress(routeAddress)
    } catch {
      return ''
    }
  }, [isOperator, routeAddress])
  const txSearchAddress = isOperator ? routeAddress : accountAddress
  const tmClient = useSelector(selectTmClient)
  const [account, setAccount] = useState<Account | null>(null)

  const [allBalances, setAllBalances] = useState<readonly Coin[] | null>(null)
  const [balanceStaked, setBalanceStaked] = useState<Coin | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txPageInfo, setTxPageInfo] = useState<PageInfo | null>(null)
  const [txLoading, setTxLoading] = useState(true)
  const [txLoadingMore, setTxLoadingMore] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const accountLinkColor = useColorModeValue('light-theme', 'dark-theme')

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

    const checksumError = /decoding bech32 failed|invalid checksum/i.test(
      `${error.message} ${error.data}`
    )
    toast({
      title: checksumError ? 'Account not found' : error.message,
      description: checksumError ? undefined : error.data,
      status: 'error',
      duration: 5000,
      isClosable: true,
    })
  }

  // First page of the address's history, newest first; for a validator, every transaction that mentions it
  const loadAccountTransactions = async () => {
    if (!txSearchAddress || !addressIsValid) return

    try {
      setTxLoading(true)
      setTxError(null)
      setTransactions([])
      setTxPageInfo(null)

      const response = await fetchAccountTransactions(
        txSearchAddress,
        ACCOUNT_TX_PAGE_SIZE
      )

      if (response.transactions?.edges) {
        setTransactions(response.transactions.edges.map((edge) => edge.node))
        setTxPageInfo(response.transactions.pageInfo)
      }
    } catch (err) {
      console.error('Failed to fetch account transactions:', err)
      setTxError(
        err instanceof Error ? err.message : 'Failed to fetch transactions'
      )
    } finally {
      setTxLoading(false)
    }
  }

  // Next page, continued from the cursor the previous page ended on
  const loadMoreAccountTransactions = async () => {
    if (!txSearchAddress || !txPageInfo?.hasNextPage || !txPageInfo.endCursor) return

    try {
      setTxLoadingMore(true)

      const response = await fetchAccountTransactions(
        txSearchAddress,
        ACCOUNT_TX_PAGE_SIZE,
        txPageInfo.endCursor
      )

      if (response.transactions?.edges) {
        const more = response.transactions.edges.map((edge) => edge.node)
        setTransactions((prev) => [...prev, ...more])
        setTxPageInfo(response.transactions.pageInfo)
      }
    } catch (err) {
      console.error('Failed to fetch more account transactions:', err)
      toast({
        title: 'Failed to load more transactions',
        description: err instanceof Error ? err.message : undefined,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setTxLoadingMore(false)
    }
  }

  useEffect(() => {
    if (!tmClient || !accountAddress || !addressIsValid) return

    let cancelled = false
    setAccount(null)
    setAllBalances(null)
    setBalanceStaked(null)

    getAccount(tmClient, accountAddress)
      .then((value) => {
        if (!cancelled) setAccount(value)
      })
      .catch((err) => {
        if (!cancelled) showError(err)
      })

    getAllBalances(tmClient, accountAddress)
      .then((value) => {
        if (!cancelled) setAllBalances(value)
      })
      .catch((err) => {
        if (!cancelled) showError(err)
      })

    getBalanceStaked(tmClient, accountAddress)
      .then((value) => {
        if (!cancelled) setBalanceStaked(value)
      })
      .catch((err) => {
        if (!cancelled) showError(err)
      })

    return () => {
      cancelled = true
    }
  }, [tmClient, accountAddress])

  useEffect(() => {
    loadAccountTransactions()
  }, [txSearchAddress])

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
        <title>{isOperator ? 'Validator' : 'Detail Account'} | Tellor Explorer</title>
        <meta name="description" content={isOperator ? 'Validator | Tellor Explorer' : 'Account | Tellor Explorer'} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>{isOperator ? 'Validator' : 'Account'}</Heading>
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
          <Text>{isOperator ? 'Validators' : 'Accounts'}</Text>
          <Icon fontSize="16" as={FiChevronRight} />
          <Text>Detail</Text>
        </HStack>
        {routeAddress && !addressIsValid ? (
          <Box
            mt={8}
            bg={useColorModeValue('light-container', 'dark-container')}
            border="1px solid"
            borderColor={useColorModeValue('border.light', 'border.dark')}
            borderRadius="2xl"
            p={4}
          >
            <Text>Account not found</Text>
          </Box>
        ) : null}
        {addressIsValid && (
          <>
        {isOperator && <ValidatorOperatorView operatorAddress={routeAddress} />}
        <Box
          mt={8}
          bg={useColorModeValue('light-container', 'dark-container')}
          border="1px solid" borderColor={useColorModeValue('border.light', 'border.dark')}
          borderRadius="2xl"
          p={4}
        >
          <Heading size={'md'} mb={4}>
            {isOperator ? 'Operator account' : 'Profile'}
          </Heading>
          <Divider borderColor={'gray'} mb={4} />
          <TableContainer>
            <Table variant="unstyled" size={'sm'}>
              <Tbody>
                <Tr>
                  <Td pl={0} width={150}>
                    <b>Address</b>
                  </Td>
                  <Td wordBreak="break-all">
                    {isOperator && accountAddress ? (
                      <Link
                        as={NextLink}
                        href={'/accounts/' + accountAddress}
                        color={accountLinkColor}
                      >
                        {accountAddress}
                      </Link>
                    ) : (
                      accountAddress || address
                    )}
                  </Td>
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
                      {allBalances?.map((item, index) => (
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
          {isOperator && (
            <Text fontSize="sm" color="gray.500" mb={4}>
              Mentioning this validator
            </Text>
          )}
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
          {!txLoading && !txError && txPageInfo?.hasNextPage && (
            <Flex justify="center" mt={4}>
              <Button
                onClick={loadMoreAccountTransactions}
                colorScheme="blue"
                variant="outline"
                isLoading={txLoadingMore}
              >
                Load More
              </Button>
            </Flex>
          )}
        </Box>
          </>
        )}
      </main>
    </>
  )
}
