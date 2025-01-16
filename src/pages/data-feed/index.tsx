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

interface ReportAttribute {
  key: string
  value: string
  displayValue?: string
}

interface OracleReport {
  type: string
  queryId: string
  value: string
  numberOfReporters: string
  microReportHeight: string
  blockHeight: number
  timestamp: Date
  attributes?: ReportAttribute[]
}

export default function DataFeed() {
  const tmClient = useSelector(selectTmClient)
  const newBlock = useSelector(selectNewBlock)
  const [aggregateReports, setAggregateReports] = useState<OracleReport[]>([])
  const toast = useToast()

  useEffect(() => {
    if (newBlock) {
      const blockHeight = newBlock.header.height
      console.log('Fetching block results for height:', blockHeight)

      axios
        .get(`https://rpc.layer-node.com/block_results?height=${blockHeight}`)
        .then((response) => {
          const blockResults = response.data.result

          // Focus on finalize_block_events
          const finalizeEvents = blockResults.finalize_block_events || []

          finalizeEvents.forEach((event) => {
            if (event.type === 'aggregate_report') {
              console.log('Found aggregate report event:', event)
              try {
                const attributes: ReportAttribute[] = event.attributes.map(
                  (attr) => ({
                    key: attr.key,
                    value: attr.value,
                  })
                )

                // Format the value if it's a hex string
                const formattedAttributes = attributes.map((attr) => {
                  if (attr.key === 'value' && attr.value.startsWith('0000')) {
                    try {
                      const valueInWei = BigInt('0x' + attr.value)
                      const valueInEth = Number(valueInWei) / 1e18
                      return { ...attr, displayValue: valueInEth.toFixed(2) }
                    } catch (e) {
                      console.error('Failed to format value:', e)
                      return attr
                    }
                  }
                  return attr
                })

                const valueAttr = formattedAttributes.find(
                  (attr) => attr.key === 'value'
                )

                const newReport: OracleReport = {
                  type: event.type,
                  queryId:
                    attributes.find((attr) => attr.key === 'query_id')?.value ||
                    'Unknown',
                  value:
                    valueAttr?.displayValue || valueAttr?.value || 'Unknown',
                  numberOfReporters:
                    attributes.find(
                      (attr) => attr.key === 'number_of_reporters'
                    )?.value || '0',
                  microReportHeight:
                    attributes.find(
                      (attr) => attr.key === 'micro_report_height'
                    )?.value || '0',
                  blockHeight: Number(blockHeight),
                  timestamp: new Date(),
                  attributes: formattedAttributes,
                }

                console.log('Processed report:', newReport)
                setAggregateReports((prev) =>
                  [newReport, ...prev].slice(0, 100)
                )
              } catch (error) {
                console.error('Error processing aggregate report:', error)
              }
            }
          })
        })
        .catch((error) => {
          console.error('Error fetching block results:', error)
          if (error.response) {
            console.error('Error response:', error.response.data)
          }
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
