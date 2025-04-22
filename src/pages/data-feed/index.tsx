import { useState, useEffect, useRef, useCallback } from 'react'
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
import { NewBlockEvent, TxEvent } from '@cosmjs/tendermint-rpc'
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
  aggregateMethod?: string
  cycleList?: boolean
  queryType?: string
  totalPower?: number
}

interface EventAttribute {
  key: string
  value: string
}

interface AggregateReportEvent {
  type: string
  attributes: EventAttribute[]
}

const getQueryPairName = (queryId: string): string => {
  if (queryId.endsWith('ad78ac')) return 'BTC/USD'
  if (queryId.endsWith('67ded0')) return 'TRB/USD'
  if (queryId.endsWith('ce4992')) return 'ETH/USD'
  return queryId
}

const fetchReporterData = async (block: NewBlockEvent, attributes: any[]) => {
  try {
    const queryIdAttr = attributes.find((attr) => attr.key === 'query_id')
    const queryId = queryIdAttr?.value

    if (!queryId) {
      console.warn('No queryId found in attributes')
      return null
    }

    const timestamp = block.header.time.getTime().toString()
    const reporterData = await getReporterCount(queryId, timestamp)

    const valueAttr = attributes.find((attr) => attr.key === 'value')
    // ... rest of the function
  } catch (error) {
    console.error('Error fetching reporter data:', error)
    return null
  }
}

export default function DataFeed() {
  const tmClient = useSelector(selectTmClient)
  const newBlock = useSelector(selectNewBlock)
  const [aggregateReports, setAggregateReports] = useState<OracleReport[]>([])
  const processedBlocksRef = useRef(new Set<number>())
  const toast = useToast()

  useEffect(() => {
    // Clear any stored custom RPC endpoint
    localStorage.removeItem('LS_RPC_ADDRESS')
    // Reset the RPC manager
    rpcManager.setCustomEndpoint(null)
  }, []) // Empty dependency array means this runs once when component mounts

  const processBlock = useCallback(
    async (block: NewBlockEvent): Promise<void> => {
      const blockHeight = block.header.height
      
      // More robust duplicate check
      if (processedBlocksRef.current.has(blockHeight) || 
          aggregateReports.some(report => report.blockHeight === blockHeight)) {
        console.log(`Block ${blockHeight} already processed, skipping...`);
        return;
      }

      let endpoint;
      try {
        endpoint = await rpcManager.getCurrentEndpoint()
        const baseEndpoint = endpoint.replace('/rpc', '')
        
        const response = await axios.get(
          `${baseEndpoint}/block_results?height=${blockHeight}`,
          {
            timeout: 10000
          }
        )
        
        const blockResults = response.data.result
        const finalizeEvents = blockResults.finalize_block_events || []
        let hasNewReports = false;

        for (const aggregateEvent of finalizeEvents) {
          if (aggregateEvent.type === 'aggregate_report') {
            try {
              const attributes: ReportAttribute[] =
                aggregateEvent.attributes.map(
                  (attr: { key: string; value: string; index?: boolean }) => {
                    let decodedValue = attr.value
                    if (
                      attr.key === 'value' &&
                      attr.value.match(/^[0-9a-fA-F]+$/)
                    ) {
                      try {
                        const valueInWei = BigInt(`0x${attr.value}`)
                        const valueInEth = Number(valueInWei) / 1e18
                        decodedValue = valueInEth.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      } catch (error) {
                        console.debug('Error decoding hex value:', error)
                      }
                    }
                    return {
                      key: attr.key,
                      value: decodedValue,
                    }
                  }
                )

              const queryId = attributes.find(
                (attr) => attr.key === 'query_id'
              )?.value

              if (!queryId) {
                console.warn('No queryId found in attributes')
                continue
              }

              // Use the API endpoint for reporter data
              const timestamp = block.header.time.getTime().toString()
              const reporterData = await getReporterCount(queryId, timestamp)

              if (!reporterData) {
                console.warn('No reporter data found for queryId:', queryId)
                continue
              }

              const valueAttr = attributes.find((attr) => attr.key === 'value')

              const newReport: OracleReport = {
                type: aggregateEvent.type,
                queryId: queryId || 'Unknown',
                value: valueAttr?.value || 'Unknown',
                numberOfReporters: reporterData.count.toString(),
                microReportHeight:
                  attributes.find((attr) => attr.key === 'micro_report_height')
                    ?.value || '0',
                blockHeight: Number(blockHeight),
                timestamp: new Date(block.header.time.toISOString()),
                attributes,
                queryType: reporterData.queryType || 'N/A',
                aggregateMethod: reporterData.aggregateMethod || 'N/A',
                cycleList: reporterData.cycleList || false,
                totalPower: reporterData.totalPower,
              }

              setAggregateReports(prev => {
                // Check if we already have this report
                const exists = prev.some(r => 
                  r.blockHeight === newReport.blockHeight && 
                  r.queryId === newReport.queryId
                );
                
                if (exists) {
                  return prev;
                }
                
                hasNewReports = true;
                return [newReport, ...prev].slice(0, 100);
              });
            } catch (error) {
              console.error('Error processing aggregate event:', error)
            }
          }
        }
        
        // Only mark the block as processed if we actually processed it
        if (hasNewReports) {
          processedBlocksRef.current.add(blockHeight);
          console.log(`Successfully processed block ${blockHeight}`);
        }
      } catch (error) {
        console.error('Error in processBlock:', error)
        if (axios.isAxiosError(error) && endpoint) {
          await rpcManager.reportFailure(endpoint)
          
          if (error.message === 'Network Error') {
            toast({
              title: 'Network Error',
              description: 'Failed to fetch block data. Retrying with different endpoint...',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            })
          }
        }
      }
    },
    [aggregateReports, toast]
  )

  // Clean up old processed blocks periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const oldestAllowedBlock = Math.max(...Array.from(processedBlocksRef.current)) - 100;
      processedBlocksRef.current = new Set(
        Array.from(processedBlocksRef.current).filter(height => height > oldestAllowedBlock)
      );
    }, 60000); // Run every minute

    return () => clearInterval(cleanup);
  }, []);

  useEffect(() => {
    if (newBlock) {
      console.log('Processing new block:', newBlock.header.height);
      processBlock(newBlock);
    }
  }, [newBlock, processBlock]);

  // Remove or comment out this useEffect
  /*
  useEffect(() => {
    if (tmClient) {
      const subscribeToOracle = async () => {
        try {
          const subscription = await tmClient.subscribe(
            "tm.event = 'Tx' AND oracle.report.exists = 'true'"
          )
          console.log('Subscribed to oracle events')
          return subscription
        } catch (error) {
          console.error('Failed to subscribe to oracle events:', error)
        }
      }
      
      subscribeToOracle()
    }
  }, [tmClient])
  */

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
      <main
        style={{
          backgroundColor: useColorModeValue(
            'var(--chakra-colors-light-container)',
            'var(--chakra-colors-dark-container)'
          ),
          padding: '1rem',
        }}
      >
        <Box p={4} borderRadius={4} mb={4}>
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
        </Box>

        <Box shadow={'base'} borderRadius={4} p={4}>
          <Text fontSize="2xl" mb={4}>
            Aggregate Reports
          </Text>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th isNumeric>Value</Th>
                  <Th isNumeric># Reporters</Th>
                  <Th isNumeric>TOTAL Reprtr Pwr</Th>
                  <Th>Query Type</Th>
                  <Th>Aggregate Method</Th>
                  <Th>Cycle List</Th>
                  <Th isNumeric>Block Height</Th>
                  <Th isNumeric>Micro Report Height</Th>
                  <Th>Timestamp</Th>
                </Tr>
              </Thead>
              <Tbody>
                {aggregateReports.map((report, index) => (
                  <Tr key={index}>
                    <Td>
                      <Text isTruncated maxW="200px" title={report.queryId}>
                        {getQueryPairName(report.queryId)}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      {report.queryType === 'SpotPrice'
                        ? report.value.startsWith('$')
                          ? report.value
                          : `$${report.value}`
                        : report.value}
                    </Td>
                    <Td isNumeric>{report.numberOfReporters}</Td>
                    <Td isNumeric>
                      {report.totalPower?.toLocaleString() + ' TRB' || '0 TRB'}
                    </Td>
                    <Td>{report.queryType || 'N/A'}</Td>
                    <Td>{report.aggregateMethod || 'N/A'}</Td>
                    <Td>{report.cycleList ? 'Yes' : 'No'}</Td>
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
                    <Td isNumeric>{report.microReportHeight}</Td>
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
