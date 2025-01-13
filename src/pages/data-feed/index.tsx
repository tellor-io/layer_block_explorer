import { useState, useEffect } from 'react'
import Head from 'next/head'
import {
  Box,
  Divider,
  HStack,
  Heading,
  Icon,
  Link,
  Text,
  VStack,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tag,
  Code,
  useToast,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { FiChevronRight, FiHome } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { selectTmClient } from '@/store/connectSlice'
import { selectNewBlock } from '@/store/streamSlice'
import { timeFromNow } from '@/utils/helper'

interface AggregateReportEvent {
  type: string
  attributes: {
    key: string
    value: string
  }[]
  blockHeight: number
  timestamp: Date
}

export default function DataFeed() {
  const tmClient = useSelector(selectTmClient)
  const newBlock = useSelector(selectNewBlock)
  const [aggregateReports, setAggregateReports] = useState<
    AggregateReportEvent[]
  >([])
  const toast = useToast()

  useEffect(() => {
    if (newBlock) {
      try {
        // Check if there are transactions
        if (!newBlock.txs || newBlock.txs.length === 0) {
          console.debug('No transactions in block:', newBlock.header.height)
          return
        }

        // Process each transaction
        newBlock.txs.forEach((tx: Uint8Array) => {
          try {
            const decodedString = new TextDecoder().decode(tx)

            // Check if this is a MsgSubmitValue transaction
            if (decodedString.includes('/layer.oracle.MsgSubmitValue')) {
              // Extract key information using regex
              const queryIdMatch = decodedString.match(
                /SpotPrice.*?(eth|trb).*?usd/i
              )
              const valueMatch = decodedString.match(/@([0-9a-f]+)/i)

              if (queryIdMatch && valueMatch) {
                const pair = `${queryIdMatch[1]}/USD`.toUpperCase()
                const hexValue = valueMatch[1]

                const newReport = {
                  type: 'aggregate_report',
                  attributes: [
                    { key: 'query_id', value: pair },
                    { key: 'value', value: hexValue },
                    { key: 'power', value: '1' },
                  ],
                  blockHeight: newBlock.header.height,
                  timestamp: new Date(),
                }

                setAggregateReports((prev) =>
                  [newReport, ...prev].slice(0, 100)
                )

                toast({
                  title: 'New Price Report',
                  description: `Received ${pair} price update in block ${newBlock.header.height}`,
                  status: 'info',
                  duration: 3000,
                  isClosable: true,
                })
              }
            }
          } catch (txError) {
            console.debug('Error processing transaction:', txError)
          }
        })
      } catch (error) {
        console.error('Error processing block events:', error)
        console.debug('Block data:', newBlock)
      }
    }
  }, [newBlock, toast])

  return (
    <>
      <Head>
        <title>Data Feed | Layer Explorer</title>
        <meta
          name="description"
          content="Live Aggregate Reports | Layer Explorer"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Live Aggregate Reports</Heading>
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
          <Text>Data Feed</Text>
        </HStack>

        <Box
          mt={8}
          bg={useColorModeValue('light-container', 'dark-container')}
          shadow={'base'}
          borderRadius={4}
          p={4}
        >
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Time</Th>
                <Th>Block</Th>
                <Th>Query ID</Th>
                <Th>Value</Th>
                <Th>Power</Th>
              </Tr>
            </Thead>
            <Tbody>
              {aggregateReports.map((report, index) => {
                // Find relevant attributes
                const queryId = report.attributes.find(
                  (attr) => attr.key === 'query_id'
                )?.value
                const value = report.attributes.find(
                  (attr) => attr.key === 'value'
                )?.value
                const power = report.attributes.find(
                  (attr) => attr.key === 'power'
                )?.value

                return (
                  <Tr key={index}>
                    <Td>{timeFromNow(report.timestamp.toISOString())}</Td>
                    <Td>
                      <Link
                        as={NextLink}
                        href={`/blocks/${report.blockHeight}`}
                      >
                        {report.blockHeight}
                      </Link>
                    </Td>
                    <Td>
                      <Code>{queryId || 'N/A'}</Code>
                    </Td>
                    <Td>
                      <Code>{value || 'N/A'}</Code>
                    </Td>
                    <Td>
                      <Tag colorScheme="purple">{power || 'N/A'}</Tag>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>

          {aggregateReports.length === 0 && (
            <Text textAlign="center" py={4} color="gray.500">
              Waiting for aggregate report events...
            </Text>
          )}
        </Box>
      </main>
    </>
  )
}
