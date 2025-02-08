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
  TableContainer,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { FiChevronRight, FiHome } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { selectTmClient } from '@/store/connectSlice'
import { selectNewBlock } from '@/store/streamSlice'
import { timeFromNow } from '@/utils/helper'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import axios from 'axios'
import { getReporterCount, decodeQueryData } from '@/rpc/query'
import { rpcManager } from '@/utils/rpcManager'

interface ReportAttribute {
  key: string
  value: string
  displayValue?: string
}

interface OracleReport {
  type: string
  queryId: string
  decodedQuery?: string
  value: string
  numberOfReporters: string
  microReportHeight: string
  blockHeight: number
  timestamp: Date
  attributes?: ReportAttribute[]
}

interface EventAttribute {
  key: string
  value: string
}

interface AggregateReportEvent {
  type: string
  attributes: EventAttribute[]
}

export default function DataFeed() {
  const tmClient = useSelector(selectTmClient)
  const newBlock = useSelector(selectNewBlock)
  const [aggregateReports, setAggregateReports] = useState<OracleReport[]>([])
  const toast = useToast()

  useEffect(() => {
    const processedBlocks = new Set()

    if (newBlock) {
      const blockHeight = newBlock.header.height

      // Skip if we've already processed this block
      if (processedBlocks.has(blockHeight)) {
        return
      }
      processedBlocks.add(blockHeight)

      // Get the current endpoint from rpcManager
      rpcManager.getCurrentEndpoint().then((endpoint) => {
        axios
          .get(`${endpoint}/block_results?height=${blockHeight}`)
          .then(async (response) => {
            const blockResults = response.data.result
            const finalizeEvents = blockResults.finalize_block_events || []

            // Process each event sequentially
            for (const aggregateEvent of finalizeEvents) {
              if (aggregateEvent.type === 'aggregate_report') {
                try {
                  const attributes: ReportAttribute[] =
                    aggregateEvent.attributes.map(
                      (attr: {
                        key: string
                        value: string
                        index?: boolean
                      }) => ({
                        key: attr.key,
                        value: attr.value,
                      })
                    )

                  // Format the value if it's a hex string
                  const formattedAttributes = attributes.map(
                    (attr: {
                      key: string
                      value: string
                      displayValue?: string
                    }) => {
                      if (
                        attr.key === 'value' &&
                        attr.value.startsWith('0000')
                      ) {
                        try {
                          const valueInWei = BigInt('0x' + attr.value)
                          const valueInEth = Number(valueInWei) / 1e18

                          // Check for query_data attribute
                          const queryData = attributes.find(
                            (a) => a.key === 'query_data'
                          )?.value

                          // If query data exists and includes SpotPrice
                          if (
                            queryData &&
                            queryData.toLowerCase().includes('spotprice')
                          ) {
                            const formattedValue = `$${valueInEth.toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}`
                            return { ...attr, displayValue: formattedValue }
                          }

                          return {
                            ...attr,
                            displayValue: valueInEth.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }),
                          }
                        } catch (e) {
                          console.error('Failed to format value:', e)
                          return attr
                        }
                      }
                      return attr
                    }
                  )

                  const valueAttr = formattedAttributes.find(
                    (attr) => attr.key === 'value'
                  )

                  const queryId =
                    attributes.find(
                      (attr: ReportAttribute) => attr.key === 'query_id'
                    )?.value || ''

                  // Format timestamp in milliseconds
                  const timestamp = newBlock.header.time.getTime().toString()

                  const reporterCount = await getReporterCount(
                    queryId,
                    timestamp
                  )

                  const newReport: OracleReport = {
                    type: aggregateEvent.type,
                    queryId: queryId || 'Unknown',
                    value:
                      valueAttr?.displayValue || valueAttr?.value || 'Unknown',
                    numberOfReporters: reporterCount.toString(),
                    microReportHeight:
                      attributes.find(
                        (attr: ReportAttribute) =>
                          attr.key === 'micro_report_height'
                      )?.value || '0',
                    blockHeight: Number(blockHeight),
                    timestamp: new Date(newBlock.header.time.toISOString()),
                    attributes: formattedAttributes,
                  }

                  setAggregateReports((prev) =>
                    [newReport, ...prev].slice(0, 100)
                  )
                } catch (error) {
                  console.error('Error processing aggregate report:', error)
                }
              }
            }
          })
          .catch((error) => {
            console.error('Error fetching block results:', error)
          })
      })
    }
  }, [newBlock])

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
          <Text fontSize="2xl" mb={4}>
            Aggregate Reports
          </Text>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Query ID</Th>
                  <Th isNumeric>Value</Th>
                  <Th isNumeric>Number of Reporters</Th>
                  <Th isNumeric>Micro Report Height</Th>
                  <Th isNumeric>Block Height</Th>
                  <Th>Timestamp</Th>
                </Tr>
              </Thead>
              <Tbody>
                {aggregateReports.map((report, index) => (
                  <Tr key={index}>
                    <Td>
                      <Text isTruncated maxW="200px" title={report.queryId}>
                        {report.queryId.slice(0, 8)}...
                        {report.queryId.slice(-6)}
                      </Text>
                    </Td>
                    <Td isNumeric>{report.value}</Td>
                    <Td isNumeric>{report.numberOfReporters}</Td>
                    <Td isNumeric>{report.microReportHeight}</Td>
                    <Td isNumeric>
                      <Link
                        href={`/blocks/${report.blockHeight}`}
                        color="blue.500"
                        isExternal
                      >
                        {report.blockHeight.toLocaleString()}
                        <ExternalLinkIcon mx="2px" />
                      </Link>
                    </Td>
                    <Td>{report.timestamp.toLocaleString()}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>

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
