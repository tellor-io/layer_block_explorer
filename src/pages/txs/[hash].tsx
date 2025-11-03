import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Divider,
  HStack,
  Heading,
  Icon,
  Link,
  Table,
  TableContainer,
  Tag,
  TagLabel,
  TagLeftIcon,
  Tbody,
  Td,
  Text,
  Tr,
  useColorModeValue,
  useToast,
  Spinner,
  Center,
} from '@chakra-ui/react'
import { FiChevronRight, FiHome, FiCheck, FiX } from 'react-icons/fi'
import NextLink from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import {
  timeFromNow,
  displayDate,
  isBech32Address,
  getTypeMsg,
} from '@/utils/helper'
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_TRANSACTION_BY_HASH } from '@/datasources/graphql/queries'
import { TransactionResponse, Transaction } from '@/datasources/graphql/types'

export default function DetailTransaction() {
  const router = useRouter()
  const toast = useToast()
  const { hash } = router.query
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransaction = async () => {
    if (!hash) return
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await graphqlQuery<TransactionResponse>(
        GET_TRANSACTION_BY_HASH,
        { id: hash as string }
      )
      
      if (response.transaction) {
        setTransaction(response.transaction)
      } else {
        setError('Transaction not found')
      }
    } catch (err) {
      console.error('Failed to fetch transaction:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransaction()
  }, [hash])

  const showMsgData = (msgData: any) => {
    if (msgData) {
      if (Array.isArray(msgData)) {
        return JSON.stringify(msgData)
      }

      if (!Array.isArray(msgData) && msgData.length) {
        if (isBech32Address(msgData)) {
          return (
            <Link
              as={NextLink}
              href={'/accounts/' + msgData}
              style={{ textDecoration: 'none' }}
              _focus={{ boxShadow: 'none' }}
            >
              <Text color={'cyan.400'}>{msgData}</Text>
            </Link>
          )
        } else {
          return String(msgData)
        }
      }
    }

    return ''
  }

  return (
    <>
      <Head>
        <title>Detail Transaction | Tellor Explorer</title>
        <meta name="description" content="Txs | Tellor Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Transaction</Heading>
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
          <Link
            as={NextLink}
            href={'/blocks'}
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}
          >
            <Text color={'cyan.400'}>Blocks</Text>
          </Link>
          <Icon fontSize="16" as={FiChevronRight} />
          <Text>Tx</Text>
        </HStack>
        {loading ? (
          <Center py={8}>
            <Spinner size="lg" />
          </Center>
        ) : error ? (
          <Center py={8}>
            <Text color="red.500">Error: {error}</Text>
          </Center>
        ) : transaction ? (
          <Box
            mt={8}
            bg={useColorModeValue('light-container', 'dark-container')}
            shadow={'base'}
            borderRadius={4}
            p={4}
          >
            <Heading size={'md'} mb={4}>
              Information
            </Heading>
            <Divider borderColor={'gray'} mb={4} />
            <TableContainer>
              <Table variant="unstyled" size={'sm'}>
                <Tbody>
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Transaction ID</b>
                    </Td>
                    <Td>{transaction.id}</Td>
                  </Tr>
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Status</b>
                    </Td>
                    <Td>
                      <Tag variant="subtle" colorScheme="green">
                        <TagLeftIcon as={FiCheck} />
                        <TagLabel>Success</TagLabel>
                      </Tag>
                    </Td>
                  </Tr>
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Height</b>
                    </Td>
                    <Td>
                      <Link
                        as={NextLink}
                        href={'/blocks/' + transaction.blockHeight}
                        style={{ textDecoration: 'none' }}
                        _focus={{ boxShadow: 'none' }}
                      >
                        <Text color={'cyan.400'}>{transaction.blockHeight}</Text>
                      </Link>
                    </Td>
                  </Tr>
                  <Tr>
                    <Td pl={0} width={150}>
                      <b>Time</b>
                    </Td>
                    <Td>
                      {`${timeFromNow(transaction.timestamp)} ( ${displayDate(
                        transaction.timestamp
                      )} )`}
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        ) : null}

        {transaction && (
          <Box
            mt={8}
            bg={useColorModeValue('light-container', 'dark-container')}
            shadow={'base'}
            borderRadius={4}
            p={4}
          >
            <Heading size={'md'} mb={4}>
              Transaction Data
            </Heading>
            <Divider borderColor={'gray'} mb={4} />
            <Text fontSize="sm" fontFamily="mono" whiteSpace="pre-wrap">
              {transaction.txData}
            </Text>
          </Box>
        )}
      </main>
    </>
  )
}
