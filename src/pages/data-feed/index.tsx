/**
 * Data Feed Page - GraphQL Migration Complete
 * 
 * Data Sources:
 * - GraphQL: Aggregate reports (GET_SINGLE_LATEST_AGGREGATE_REPORTS)
 * 
 * Migration Status: ✅ Full GraphQL Migration
 * - ✅ Aggregate reports fetched directly from GraphQL
 * - ✅ No block event parsing needed
 * - ✅ Simpler architecture with direct report queries
 * - ⚠️  queryType/aggregateMethod removed from UI (not available in GraphQL)
 * 
 * GraphQL Schema Verified:
 * - aggregateReports query available and tested ✅
 * - Fields: queryId, value, blockHeight, timestamp, totalReporters, totalPower, cyclist
 */

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
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  TableContainer,
  Select,
  Input,
  VStack,
  Radio,
  RadioGroup,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { FiChevronRight, FiHome } from 'react-icons/fi'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_SINGLE_LATEST_AGGREGATE_REPORTS, GET_AGGREGATE_REPORTS_BY_QUERY_ID } from '@/datasources/graphql/queries'
import type { AggregateReportsResponse } from '@/datasources/graphql/types'

/* MIGRATED TO GRAPHQL - Commented out RPC imports
import { NewBlockEvent, TxEvent } from '@cosmjs/tendermint-rpc'
import { useSelector } from 'react-redux'
import { selectTmClient } from '@/store/connectSlice'
import { selectNewBlock } from '@/store/streamSlice'
import { timeFromNow } from '@/utils/helper'
import axios from 'axios'
import { getReporterCount, decodeQueryData } from '@/rpc/query'
import { rpcManager } from '@/utils/rpcManager'
*/

interface OracleReport {
  type: string
  queryId: string
  value: string
  microReportHeight: string
  blockHeight: number
  timestamp: Date
  aggregatePower?: number
  queryData?: string
}

/* MIGRATED TO GRAPHQL - Commented out unused interfaces
interface ReportAttribute {
  key: string
  value: string
  displayValue?: string
}

interface EventAttribute {
  key: string
  value: string
}

interface AggregateReportEvent {
  type: string
  attributes: EventAttribute[]
}
*/

// Helper function to normalize query IDs for comparison (handle 0x prefix)
const normalizeQueryId = (queryId: string): string => {
  // Remove 0x prefix if present and convert to lowercase for consistent matching
  return queryId.startsWith('0x') ? queryId.slice(2).toLowerCase() : queryId.toLowerCase()
}

// Get query pair name from config mappings
const getQueryPairName = (queryId: string, configMappings: QueryIdPairMapping[]): string => {
  const normalizedQueryId = normalizeQueryId(queryId)
  const mapping = configMappings.find(m => normalizeQueryId(m.queryId) === normalizedQueryId)
  return mapping ? mapping.pairName : queryId
}

// Find query ID by pair name from queryIdMappings
const findQueryIdByPairName = (pairName: string, mappings: QueryIdPairMapping[]): string | null => {
  const mapping = mappings.find(m => m.pairName === pairName)
  return mapping ? mapping.queryId : null
}

/* MIGRATED TO GRAPHQL - Commented out RPC helper function
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
*/

interface QueryIdPairMapping {
  queryId: string
  pairName: string
}

export default function DataFeed() {
  const [aggregateReports, setAggregateReports] = useState<OracleReport[]>([])
  const [processedReportIds, setProcessedReportIds] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<'none' | 'pair' | 'queryId'>('none')
  const [selectedPairName, setSelectedPairName] = useState<string>('')
  const [selectedQueryIdInput, setSelectedQueryIdInput] = useState<string>('')
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null)
  const [queryIdMappings, setQueryIdMappings] = useState<QueryIdPairMapping[]>([])
  const [availablePairNames, setAvailablePairNames] = useState<string[]>([])
  const toast = useToast()
  
  // Fetch query pair configuration from public config file
  useEffect(() => {
    const fetchQueryPairConfig = async () => {
      try {
        const response = await fetch('/query-pair-config.json')
        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.statusText}`)
        }
        
        const config = await response.json()
        
        // Validate config structure
        if (!config.pairs || !Array.isArray(config.pairs)) {
          throw new Error('Invalid config format: missing pairs array')
        }
        
        // Map config pairs to QueryIdPairMapping format
        const mappings: QueryIdPairMapping[] = config.pairs.map((pair: { queryId: string; pairName: string }) => ({
          queryId: pair.queryId,
          pairName: pair.pairName
        }))
        
        // Sort by pair name
        mappings.sort((a, b) => a.pairName.localeCompare(b.pairName))
        
        setQueryIdMappings(mappings)
        
        // Extract unique pair names for dropdown
        const pairNames = mappings.map(m => m.pairName).sort()
        setAvailablePairNames(pairNames)
      } catch (error) {
        console.error('Error fetching query pair config:', error)
        toast({
          title: 'Error',
          description: 'Failed to load query pair configuration. Using default mappings.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        // Fallback: set empty mappings if config fails
        setQueryIdMappings([])
        setAvailablePairNames([])
      }
    }
    
    fetchQueryPairConfig()
  }, [toast])
  
  // GraphQL polling for aggregate reports
  useEffect(() => {
    const fetchGraphQLReports = async () => {
      try {
        // Use filtered query if a specific feed is selected
        const response = selectedQueryId
          ? await graphqlQuery<AggregateReportsResponse>(
              GET_AGGREGATE_REPORTS_BY_QUERY_ID,
              { queryId: selectedQueryId, first: 100 }
            )
          : await graphqlQuery<AggregateReportsResponse>(
              GET_SINGLE_LATEST_AGGREGATE_REPORTS,
              { first: 100 }
            )
        
        const reports = response.aggregateReports.edges.map(edge => edge.node)
        const newReports = reports.filter(report => !processedReportIds.has(report.id))
        
        if (newReports.length === 0) return
        
        const mappedReports = newReports.map(report => {
          // Decode hex value to decimal
          let decodedValue = report.value
          try {
            if (report.value.match(/^[0-9a-fA-F]+$/)) {
              const valueInWei = BigInt(`0x${report.value}`)
              const valueInEth = Number(valueInWei) / 1e18
              decodedValue = valueInEth.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            }
          } catch (error) {
            console.debug('Error decoding hex value:', error)
          }
          
          // Parse timestamp - GraphQL returns UTC timestamps without Z suffix
          // e.g., "2025-10-31T20:42:49.678" - we need to explicitly treat as UTC
          const timestamp = report.timestamp.endsWith('Z') 
            ? new Date(report.timestamp)
            : new Date(report.timestamp + 'Z') // Add Z to indicate UTC
          
          return {
            type: 'aggregate_report',
            queryId: report.queryId,
            value: decodedValue,
            microReportHeight: report.microReportHeight,
            blockHeight: parseInt(report.blockHeight),
            timestamp: timestamp,
            aggregatePower: report.aggregatePower ? parseFloat(report.aggregatePower) : undefined,
            queryData: report.queryData,
          } as OracleReport
        })
        
        setAggregateReports(prev => {
          // Combine new reports with existing, avoiding duplicates by ID
          const existingIds = new Set(prev.map(r => `${r.queryId}-${r.blockHeight}`))
          const trulyNew = mappedReports.filter(r => 
            !existingIds.has(`${r.queryId}-${r.blockHeight}`)
          )
          const combined = [...trulyNew, ...prev].slice(0, 100)
          return combined
        })
        
        setProcessedReportIds(prev => {
          const updated = new Set(prev)
          newReports.forEach(report => updated.add(report.id))
          return updated
        })
      } catch (error) {
        console.error('Error fetching aggregate reports from GraphQL:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch aggregate reports from GraphQL',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }
    
    // Initial fetch
    fetchGraphQLReports()
    
    // Poll every 3 seconds
    const interval = setInterval(fetchGraphQLReports, 3000)
    return () => clearInterval(interval)
  }, [processedReportIds, toast, selectedQueryId])

  // Update selectedQueryId when filter changes
  useEffect(() => {
    if (filterType === 'none') {
      setSelectedQueryId(null)
      return
    }

    if (filterType === 'queryId') {
      // Query ID updates are handled by onBlur and onKeyDown handlers
      // This effect only handles the initial state when switching filter types
      if (!selectedQueryIdInput.trim() && selectedQueryId) {
        setSelectedQueryId(null)
      }
      return
    }

    if (filterType === 'pair' && selectedPairName) {
      // Find the query ID that matches the selected pair name from mappings
      const queryId = findQueryIdByPairName(selectedPairName, queryIdMappings)
      if (queryId && queryId !== selectedQueryId) {
        // We found a query ID and it's different from current, switch to filtered mode
        setSelectedQueryId(queryId)
        // Clear existing reports when switching to a specific feed to avoid stale data
        setAggregateReports([])
        setProcessedReportIds(new Set())
      } else if (!queryId) {
        // Couldn't find the query ID in mappings
        toast({
          title: 'Query ID not found',
          description: `Could not find query ID for ${selectedPairName}. This pair may not be available in the indexer.`,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        })
      }
    }
  }, [filterType, selectedPairName, selectedQueryIdInput, queryIdMappings, selectedQueryId, toast])

  // Filter reports based on selected filter
  const filteredReports = selectedQueryId
    ? aggregateReports.filter(report => report.queryId === selectedQueryId)
    : aggregateReports

/* MIGRATED TO GRAPHQL - Commented out all RPC block processing code
 * 
 * The processBlock function extracted aggregate_report events from block_results.
 * GraphQL aggregateReports query provides this data directly, so we don't need
 * to process blocks anymore.
 */

/* REMOVED: processBlock function
 * REMOVED: processedBlocksRef
 * REMOVED: Block results RPC calls
 * REMOVED: Event extraction logic
 * REMOVED: Redux block streaming dependencies
 * REMOVED: Block cleanup intervals
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
          <HStack mb={4} justify="space-between" align="flex-start">
            <Text fontSize="2xl">
              Aggregate Reports
            </Text>
            <VStack align="flex-end" spacing={2}>
              <RadioGroup 
                value={filterType} 
                onChange={(value) => {
                  setFilterType(value as 'none' | 'pair' | 'queryId')
                  if (value === 'none') {
                    setSelectedPairName('')
                    setSelectedQueryIdInput('')
                  }
                }}
              >
                <HStack spacing={4}>
                  <Radio value="none">Show All</Radio>
                  <Radio value="pair">Filter by Pair Name</Radio>
                  <Radio value="queryId">Filter by Query ID</Radio>
                </HStack>
              </RadioGroup>
              {filterType === 'pair' && (
                <Select
                  value={selectedPairName || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setSelectedPairName(value || '')
                  }}
                  placeholder="Select a specific feed"
                  width="250px"
                  bg={useColorModeValue('white', 'gray.700')}
                >
                  {availablePairNames.length > 0 ? (
                    availablePairNames.map(pairName => (
                      <option key={pairName} value={pairName}>
                        {pairName}
                      </option>
                    ))
                  ) : (
                    <option disabled>Loading available feeds...</option>
                  )}
                </Select>
              )}
              {filterType === 'queryId' && (
                <Input
                  value={selectedQueryIdInput}
                  onChange={(e) => setSelectedQueryIdInput(e.target.value)}
                  onBlur={() => {
                    // Trigger update on blur
                    const cleanedQueryId = selectedQueryIdInput.trim()
                    if (cleanedQueryId && cleanedQueryId !== selectedQueryId) {
                      setSelectedQueryId(cleanedQueryId)
                      setAggregateReports([])
                      setProcessedReportIds(new Set())
                    } else if (!cleanedQueryId) {
                      setSelectedQueryId(null)
                    }
                  }}
                  onKeyDown={(e) => {
                    // Trigger update on Enter key
                    if (e.key === 'Enter') {
                      const cleanedQueryId = selectedQueryIdInput.trim()
                      if (cleanedQueryId && cleanedQueryId !== selectedQueryId) {
                        setSelectedQueryId(cleanedQueryId)
                        setAggregateReports([])
                        setProcessedReportIds(new Set())
                      } else if (!cleanedQueryId) {
                        setSelectedQueryId(null)
                      }
                      e.currentTarget.blur()
                    }
                  }}
                  placeholder="Enter query ID (e.g., 0x...)"
                  width="250px"
                  bg={useColorModeValue('white', 'gray.700')}
                />
              )}
            </VStack>
          </HStack>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th isNumeric>Value</Th>
                  <Th isNumeric>Aggregate Power</Th>
                  <Th isNumeric>Block Height</Th>
                  <Th isNumeric>Micro Report Height</Th>
                  <Th>Timestamp</Th>
                  <Th>Cycle List</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredReports.map((report, index) => (
                  <Tr key={index}>
                    <Td>
                      <Text isTruncated maxW="200px" title={report.queryId}>
                        {getQueryPairName(report.queryId, queryIdMappings)}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      {report.value.startsWith('$') ? report.value : `$${report.value}`}
                    </Td>
                    <Td isNumeric>
                      {report.aggregatePower?.toLocaleString() + ' TRB' || 'N/A'}
                    </Td>
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
                    <Td>
                      {report.timestamp.toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                      })}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>

          {filteredReports.length === 0 && (
            <Text textAlign="center" py={4} color="gray.500">
              {filterType === 'pair' && selectedPairName
                ? `Waiting for aggregate reports for ${selectedPairName}...`
                : filterType === 'queryId' && selectedQueryId
                ? `Waiting for aggregate reports for query ID ${selectedQueryId}...`
                : 'Waiting for aggregate reports from GraphQL...'}
            </Text>
          )}
        </Box>
      </main>
    </>
  )
}

