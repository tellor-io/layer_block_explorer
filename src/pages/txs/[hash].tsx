import {
  Box,
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
  VStack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
  Badge,
} from '@chakra-ui/react'
import { FiChevronRight, FiHome, FiCheck, FiCopy } from 'react-icons/fi'
import NextLink from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import {
  timeFromNow,
  displayDate,
  isBech32Address,
  getTypeMsg,
  displayCoin,
} from '@/utils/helper'
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_TRANSACTION_BY_HASH } from '@/datasources/graphql/queries'
import { TransactionResponse, Transaction } from '@/datasources/graphql/types'
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin'

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

  const decodeTransaction = (txData: string): { 
    messages: any[], 
    fee: Coin[] | undefined,
    memo?: string,
    signers?: string[],
    events?: any[]
  } | null => {
    try {
      const jsonData = JSON.parse(txData)
      const tx = jsonData.tx || jsonData
      
      const fee = tx.auth_info?.fee?.amount || jsonData.auth_info?.fee?.amount
      const messages = tx.body?.messages || jsonData.body?.messages || []
      const memo = tx.body?.memo || jsonData.body?.memo
      const events = tx.events || jsonData.events || []
      
      // Extract signers from auth_info
      const signers: string[] = []
      const signerInfos = tx.auth_info?.signer_infos || jsonData.auth_info?.signer_infos || []
      signerInfos.forEach((info: any) => {
        if (info.public_key?.key) {
          signers.push(info.public_key.key)
        }
      })
      
      return {
        messages,
        fee,
        memo,
        signers: signers.length > 0 ? signers : undefined,
        events
      }
    } catch (error) {
      console.error('Error decoding transaction:', error)
      return null
    }
  }

  const getFee = (txData: string) => {
    const decoded = decodeTransaction(txData)
    if (decoded?.fee && decoded.fee.length > 0) {
      return decoded.fee.map((fee: Coin) => displayCoin(fee)).join(', ')
    }
    return '0 loya'
  }

  const showMsgData = (msgData: any) => {
    if (msgData === null || msgData === undefined) {
      return <Text color="gray.500" fontStyle="italic">null</Text>
    }
    
    if (Array.isArray(msgData)) {
      if (msgData.length === 0) {
        return <Text color="gray.500" fontStyle="italic">[]</Text>
      }
      return (
        <VStack align="start" spacing={2}>
          {msgData.map((item, idx) => (
            <Box key={idx} pl={4} borderLeft="2px solid" borderColor="gray.300">
              {showMsgData(item)}
            </Box>
          ))}
        </VStack>
      )
    }

    if (typeof msgData === 'object') {
      return (
        <VStack align="start" spacing={2}>
          {Object.entries(msgData).map(([key, value]) => (
            <HStack key={key} align="start">
              <Text fontWeight="bold" minW="150px">{key}:</Text>
              <Box flex={1}>{showMsgData(value)}</Box>
            </HStack>
          ))}
        </VStack>
      )
    }

    if (typeof msgData === 'string') {
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
      }
      return <Text>{msgData}</Text>
    }

    return <Text>{String(msgData)}</Text>
  }

  const getMessageTypeFromEvents = (events: any[], messageIndex: number): string | null => {
    if (!events || events.length === 0) {
      return null
    }
    
    // Extract message types from events (more reliable than message objects)
    const messageEvents = events.filter((e: any) => e.type === 'message') || []
    
    if (messageEvents.length === 0) {
      return null
    }
    
    // Helper to extract attribute value (handles both string and encoded formats)
    const getAttrValue = (attr: any): string | null => {
      if (!attr) return null
      
      // Handle string format
      if (typeof attr.value === 'string') {
        return attr.value
      }
      
      // Handle encoded format (Uint8Array or base64)
      if (attr.value) {
        try {
          if (attr.value instanceof Uint8Array) {
            return new TextDecoder().decode(attr.value)
          }
          if (typeof attr.value === 'object' && attr.value.data) {
            // Base64 encoded
            return Buffer.from(attr.value.data, 'base64').toString('utf-8')
          }
        } catch (e) {
          console.error('Error decoding attribute value:', e)
        }
      }
      
      return null
    }
    
    // Helper to check if attribute key matches (handles both string and encoded formats)
    const attrKeyMatches = (attr: any, targetKey: string): boolean => {
      if (!attr) return false
      
      if (typeof attr.key === 'string') {
        return attr.key === targetKey
      }
      
      if (attr.key instanceof Uint8Array) {
        return new TextDecoder().decode(attr.key) === targetKey
      }
      
      return false
    }
    
    // Try to find the message type for this specific message index
    // Messages are typically emitted in order, so we can use the index
    if (messageEvents.length > messageIndex) {
      const event = messageEvents[messageIndex]
      const actionAttr = event.attributes?.find((a: any) => attrKeyMatches(a, 'action'))
      if (actionAttr) {
        const value = getAttrValue(actionAttr)
        if (value) {
          return value // Full path like "/layer.oracle.MsgSubmitValue"
        }
      }
    }
    
    // Fallback: get all message types and return the one at the index
    const messageTypes: string[] = []
    messageEvents.forEach((event: any) => {
      const actionAttr = event.attributes?.find((a: any) => attrKeyMatches(a, 'action'))
      if (actionAttr) {
        const value = getAttrValue(actionAttr)
        if (value && !messageTypes.includes(value)) {
          messageTypes.push(value)
        }
      }
    })
    
    if (messageTypes.length > messageIndex) {
      return messageTypes[messageIndex]
    }
    
    // If we have at least one message type, use the first one (for single message transactions)
    if (messageTypes.length > 0 && messageIndex === 0) {
      return messageTypes[0]
    }
    
    return null
  }

  const inferMessageTypeFromStructure = (message: any): string | null => {
    // Try to infer message type from the message structure
    const keys = Object.keys(message || {})
    
    // Check for common message patterns
    if (keys.includes('creator') && keys.includes('queryData') && keys.includes('value')) {
      return '/layer.oracle.MsgSubmitValue'
    }
    if (keys.includes('reporter') && keys.includes('queryId')) {
      return '/layer.oracle.MsgCommitReport'
    }
    if (keys.includes('delegatorAddress') && keys.includes('validatorAddress') && keys.includes('amount')) {
      return '/cosmos.staking.v1beta1.MsgDelegate'
    }
    if (keys.includes('fromAddress') && keys.includes('toAddress') && keys.includes('amount')) {
      return '/cosmos.bank.v1beta1.MsgSend'
    }
    if (keys.includes('validatorAddress') && keys.includes('delegatorAddress')) {
      return '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward'
    }
    
    return null
  }

  const renderMessage = (message: any, index: number, events: any[]) => {
    // First try to get message type from events (most reliable)
    let msgType = getMessageTypeFromEvents(events, index)
    
    // Fallback to message object itself
    if (!msgType) {
      msgType = message['@type'] || message.typeUrl || null
    }
    
    // Last resort: try to infer from message structure
    if (!msgType) {
      msgType = inferMessageTypeFromStructure(message)
    }
    
    // Extract display name
    let msgTypeDisplay = 'Unknown'
    if (msgType) {
      // If it's a full path like "/layer.oracle.MsgSubmitValue", extract the last part
      const typeParts = msgType.split('.')
      const lastPart = typeParts[typeParts.length - 1]
      msgTypeDisplay = getTypeMsg(msgType) || lastPart || 'Unknown'
    }
    
    return (
      <Box
        key={index}
        mb={4}
        p={4}
        bg={useColorModeValue('gray.50', 'gray.800')}
        borderRadius="md"
        border="1px solid"
        borderColor={useColorModeValue('gray.200', 'gray.700')}
      >
        <HStack mb={3}>
          <Tag colorScheme="cyan" size="md">
            {msgTypeDisplay}
          </Tag>
          {msgType && (
            <Text fontSize="xs" color="gray.500" fontFamily="mono">
              {msgType}
            </Text>
          )}
        </HStack>
        <Box pl={2}>
          {Object.entries(message).filter(([key]) => key !== '@type' && key !== 'typeUrl').map(([key, value]) => (
            <HStack key={key} align="start" mb={2}>
              <Text fontWeight="semibold" minW="150px" fontSize="sm">{key}:</Text>
              <Box flex={1} fontSize="sm">{showMsgData(value)}</Box>
            </HStack>
          ))}
        </Box>
      </Box>
    )
  }

  const renderEvent = (event: any, eventIndex: number) => {
    return (
      <Box
        key={eventIndex}
        mb={3}
        p={3}
        bg={useColorModeValue('gray.50', 'gray.800')}
        borderRadius="md"
      >
        <HStack mb={2}>
          <Badge colorScheme="purple">{event.type}</Badge>
        </HStack>
        {event.attributes && event.attributes.length > 0 && (
          <TableContainer>
            <Table variant="simple" size="sm">
              <Tbody>
                {event.attributes.map((attr: any, attrIndex: number) => (
                  <Tr key={attrIndex}>
                    <Td pl={0} width="200px" fontWeight="semibold">
                      {attr.key || attrIndex}
                    </Td>
                    <Td>
                      {typeof attr.value === 'string' && isBech32Address(attr.value) ? (
                        <Link
                          as={NextLink}
                          href={'/accounts/' + attr.value}
                          style={{ textDecoration: 'none' }}
                          _focus={{ boxShadow: 'none' }}
                        >
                          <Text color={'cyan.400'}>{attr.value}</Text>
                        </Link>
                      ) : (
                        <Text fontFamily="mono" fontSize="xs">
                          {String(attr.value)}
                        </Text>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2000,
      isClosable: true,
    })
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
          <>
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
                        <b>Transaction Hash</b>
                      </Td>
                      <Td>
                        <HStack>
                          <Text fontFamily="mono" fontSize="sm">{transaction.id}</Text>
                          <Icon
                            as={FiCopy}
                            cursor="pointer"
                            onClick={() => copyToClipboard(transaction.id)}
                            _hover={{ color: 'cyan.400' }}
                          />
                        </HStack>
                      </Td>
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
                    {(() => {
                      const decoded = decodeTransaction(transaction.txData)
                      return (
                        <>
                          {decoded?.fee && decoded.fee.length > 0 && (
                            <Tr>
                              <Td pl={0} width={150}>
                                <b>Fee</b>
                              </Td>
                              <Td>{getFee(transaction.txData)}</Td>
                            </Tr>
                          )}
                          {decoded?.memo && (
                            <Tr>
                              <Td pl={0} width={150}>
                                <b>Memo</b>
                              </Td>
                              <Td>
                                <Text fontFamily="mono" fontSize="sm">{decoded.memo}</Text>
                              </Td>
                            </Tr>
                          )}
                        </>
                      )
                    })()}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>

            {(() => {
              const decoded = decodeTransaction(transaction.txData)
              if (decoded?.messages && decoded.messages.length > 0) {
                return (
                  <Box
                    mt={8}
                    bg={useColorModeValue('light-container', 'dark-container')}
                    shadow={'base'}
                    borderRadius={4}
                    p={4}
                  >
                    <Heading size={'md'} mb={4}>
                      Messages ({decoded.messages.length})
                    </Heading>
                    <Divider borderColor={'gray'} mb={4} />
                    {decoded.messages.map((msg, idx) => renderMessage(msg, idx, decoded.events || []))}
                  </Box>
                )
              }
              return null
            })()}

            {(() => {
              const decoded = decodeTransaction(transaction.txData)
              if (decoded?.events && decoded.events.length > 0) {
                return (
                  <Box
                    mt={8}
                    bg={useColorModeValue('light-container', 'dark-container')}
                    shadow={'base'}
                    borderRadius={4}
                    p={4}
                  >
                    <Heading size={'md'} mb={4}>
                      Events ({decoded.events.length})
                    </Heading>
                    <Divider borderColor={'gray'} mb={4} />
                    {decoded.events.map((event, idx) => renderEvent(event, idx))}
                  </Box>
                )
              }
              return null
            })()}

            {transaction && (
              <Box
                mt={8}
                bg={useColorModeValue('light-container', 'dark-container')}
                shadow={'base'}
                borderRadius={4}
                p={4}
              >
                <Accordion allowToggle>
                  <AccordionItem border="none">
                    <AccordionButton px={0} py={2}>
                      <Heading size={'md'} flex="1" textAlign="left">
                        Raw Transaction Data
                      </Heading>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel px={0} pb={4}>
                      <Box
                        position="relative"
                        bg={useColorModeValue('gray.50', 'gray.900')}
                        p={4}
                        borderRadius="md"
                        overflowX="auto"
                      >
                        <Icon
                          as={FiCopy}
                          position="absolute"
                          top={2}
                          right={2}
                          cursor="pointer"
                          onClick={() => copyToClipboard(transaction.txData)}
                          _hover={{ color: 'cyan.400' }}
                        />
                        <Code
                          display="block"
                          whiteSpace="pre-wrap"
                          fontSize="xs"
                          p={0}
                          bg="transparent"
                        >
                          {(() => {
                            try {
                              const parsed = JSON.parse(transaction.txData)
                              return JSON.stringify(parsed, null, 2)
                            } catch {
                              return transaction.txData
                            }
                          })()}
                        </Code>
                      </Box>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </Box>
            )}
          </>
        ) : null}
      </main>
    </>
  )
}
