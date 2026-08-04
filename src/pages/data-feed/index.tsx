/**
 * Data Feed Page - GraphQL Migration Complete
 *
 * Data Sources:
 * - GraphQL: Aggregate reports (GET_LATEST_AGGREGATE_REPORTS + filters)
 *
 * Notes:
 * - queryType is decoded from queryData (ABI first string)
 * - aggregateMethod is not indexed; SpotPrice defaults to weighted-median
 */

import { useState, useEffect, useRef } from 'react'
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
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Checkbox,
  Flex,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { FiChevronRight, FiHome, FiCalendar } from 'react-icons/fi'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { DayPicker, DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import 'react-day-picker/dist/style.css'
import { graphqlQuery } from '@/datasources/graphql/client'
import { 
  GET_SINGLE_LATEST_AGGREGATE_REPORTS, 
  GET_LATEST_AGGREGATE_REPORTS,
  GET_AGGREGATE_REPORTS_BY_QUERY_ID,
  GET_AGGREGATE_REPORTS_BY_QUERY_ID_AND_DATE,
  GET_AGGREGATE_REPORTS_BY_DATE_RANGE
} from '@/datasources/graphql/queries'
import type { AggregateReportsResponse } from '@/datasources/graphql/types'


interface OracleReport {
  type: string
  queryId: string
  value: string
  numberOfReporters: string
  microReportHeight: string
  blockHeight: number
  timestamp: Date
  queryType?: string
  aggregateMethod?: string
  totalPower?: number
  queryData?: string
}


// Helper function to normalize query IDs for comparison (handle 0x prefix)
const normalizeQueryId = (queryId: string): string => {
  // Remove 0x prefix if present and convert to lowercase for consistent matching
  return queryId.startsWith('0x') ? queryId.slice(2).toLowerCase() : queryId.toLowerCase()
}

// Helper function to truncate 0x prefix from query IDs for GraphQL queries
const truncateQueryIdPrefix = (queryId: string): string => {
  // Remove 0x prefix if present for GraphQL API
  return queryId.startsWith('0x') ? queryId.slice(2) : queryId
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

/**
 * Extract the ABI-encoded query type string from Tellor queryData hex.
 * Format starts with: (string queryType, ...)
 */
const decodeQueryType = (queryData?: string): string => {
  if (!queryData) return 'N/A'
  try {
    const cleanHex = queryData.startsWith('0x') ? queryData.slice(2) : queryData
    if (!/^[0-9a-fA-F]+$/.test(cleanHex) || cleanHex.length < 128) {
      return 'N/A'
    }

    const queryTypeOffset = Number(BigInt('0x' + cleanHex.slice(0, 64)))
    const lengthStart = queryTypeOffset * 2
    if (lengthStart + 64 > cleanHex.length) return 'N/A'

    const queryTypeLength = Number(BigInt('0x' + cleanHex.slice(lengthStart, lengthStart + 64)))
    const dataStart = lengthStart + 64
    const dataEnd = dataStart + queryTypeLength * 2
    if (queryTypeLength <= 0 || dataEnd > cleanHex.length) return 'N/A'

    let queryType = ''
    for (let i = dataStart; i < dataEnd; i += 2) {
      queryType += String.fromCharCode(parseInt(cleanHex.slice(i, i + 2), 16))
    }

    return queryType.replace(/\0/g, '').trim() || 'N/A'
  } catch {
    return 'N/A'
  }
}

/**
 * Decode aggregate report value. SpotPrice values are uint256 (18 decimals);
 * longer ABI payloads are left as hex.
 */
const decodeReportValue = (rawValue: string, queryType: string): string => {
  try {
    const cleanHex = rawValue.startsWith('0x') ? rawValue.slice(2) : rawValue
    if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
      return rawValue
    }

    // SpotPrice (and similar) values are a single uint256 — typically 64 hex chars
    if (queryType === 'SpotPrice' && cleanHex.length <= 66) {
      const valueInEth = Number(BigInt(`0x${cleanHex}`)) / 1e18
      return valueInEth.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    }

    // Short numeric hex values — treat as 18-decimal numbers
    if (cleanHex.length <= 66) {
      const valueInEth = Number(BigInt(`0x${cleanHex}`)) / 1e18
      return valueInEth.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    }
  } catch (error) {
    console.debug('Error decoding hex value:', error)
  }
  return rawValue
}


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
  
  // Date filtering state
  const [isDateFilterEnabled, setIsDateFilterEnabled] = useState<boolean>(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false)
  
  // Pagination state
  const [isPaginationMode, setIsPaginationMode] = useState<boolean>(false)
  const [currentCursor, setCurrentCursor] = useState<string | null>(null) // Cursor for next page
  const [currentPageStartCursor, setCurrentPageStartCursor] = useState<string | null>(null) // Cursor used to load current page
  const [pageHistory, setPageHistory] = useState<(string | null)[]>([]) // Stack of start cursors for back navigation
  const [hasNextPage, setHasNextPage] = useState<boolean>(false)
  const [hasPreviousPage, setHasPreviousPage] = useState<boolean>(false)
  const [pageSize] = useState<number>(50) // Number of aggregates per page
  const [lastPollingCursor, setLastPollingCursor] = useState<string | null>(null) // Track cursor from last polling query for "load more"
  
  // Use ref to track pagination mode to prevent race conditions with polling
  const isPaginationModeRef = useRef<boolean>(false)
  
  // Extract fromDate and toDate from dateRange for filtering logic
  const fromDate = dateRange?.from
  const toDate = dateRange?.to
  
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
  
  // Helper function to map GraphQL reports to OracleReport format
  const mapReportsToOracleFormat = (reports: any[]): OracleReport[] => {
    return reports.map(report => {
      const queryType = decodeQueryType(report.queryData)
      const decodedValue = decodeReportValue(report.value, queryType)

      // Parse timestamp - GraphQL returns UTC timestamps without Z suffix
      const timestamp = report.timestamp.endsWith('Z')
        ? new Date(report.timestamp)
        : new Date(report.timestamp + 'Z')

      // aggregateMethod is not indexed; SpotPrice on Layer uses weighted-median
      const aggregateMethod =
        queryType === 'SpotPrice' ? 'weighted-median' : 'N/A'

      return {
        type: 'aggregate_report',
        queryId: report.queryId,
        value: decodedValue,
        numberOfReporters: String(report.totalReporters ?? 0),
        microReportHeight: report.microReportHeight,
        blockHeight: parseInt(report.blockHeight),
        timestamp: timestamp,
        queryType,
        aggregateMethod,
        totalPower: report.totalPower != null ? parseFloat(report.totalPower) : undefined,
        queryData: report.queryData,
      } as OracleReport
    })
  }

  // Fetch aggregate reports with pagination support
  const fetchAggregateReports = async (cursor: string | null = null, isPagination: boolean = false) => {
    try {
      // Determine which query to use based on filters
      const hasDateFilter = isDateFilterEnabled && (fromDate || toDate)
      const hasQueryIdFilter = selectedQueryId !== null
      
      let response: AggregateReportsResponse
      // Use smaller batch sizes for date range queries to avoid database timeouts
      // Date range queries scan more data, so we use pagination-size batches (50) instead of 500
      const queryVars: any = {
        first: isPagination ? pageSize : (hasDateFilter ? pageSize : 100),
        ...(cursor && { after: cursor })
      }
      
      if (hasDateFilter && hasQueryIdFilter) {
        // Filter by both queryId and date range at GraphQL level
        const filterVars: any = {
          queryId: truncateQueryIdPrefix(selectedQueryId!),
          first: queryVars.first,
          ...(cursor && { after: cursor })
        }
        
        // Format dates as ISO strings for GraphQL
        if (fromDate) {
          const fromDateUTC = new Date(Date.UTC(
            fromDate.getUTCFullYear(),
            fromDate.getUTCMonth(),
            fromDate.getUTCDate(),
            0, 0, 0, 0
          ))
          filterVars.fromDate = fromDateUTC.toISOString()
        }
        
        if (toDate) {
          const toDateUTC = new Date(Date.UTC(
            toDate.getUTCFullYear(),
            toDate.getUTCMonth(),
            toDate.getUTCDate(),
            23, 59, 59, 999
          ))
          filterVars.toDate = toDateUTC.toISOString()
        }
        
        response = await graphqlQuery<AggregateReportsResponse>(
          GET_AGGREGATE_REPORTS_BY_QUERY_ID_AND_DATE,
          filterVars
        )
      } else if (hasDateFilter && !hasQueryIdFilter) {
        // Filter by date range only at GraphQL level
        const filterVars: any = { 
          first: queryVars.first,
          ...(cursor && { after: cursor })
        }
        
        if (fromDate) {
          const fromDateUTC = new Date(Date.UTC(
            fromDate.getUTCFullYear(),
            fromDate.getUTCMonth(),
            fromDate.getUTCDate(),
            0, 0, 0, 0
          ))
          filterVars.fromDate = fromDateUTC.toISOString()
        }
        
        if (toDate) {
          const toDateUTC = new Date(Date.UTC(
            toDate.getUTCFullYear(),
            toDate.getUTCMonth(),
            toDate.getUTCDate(),
            23, 59, 59, 999
          ))
          filterVars.toDate = toDateUTC.toISOString()
        }
        
        response = await graphqlQuery<AggregateReportsResponse>(
          GET_AGGREGATE_REPORTS_BY_DATE_RANGE,
          filterVars
        )
      } else if (hasQueryIdFilter) {
        // Filter by queryId only - use paginated query
        response = await graphqlQuery<AggregateReportsResponse>(
          GET_AGGREGATE_REPORTS_BY_QUERY_ID,
          {
            queryId: truncateQueryIdPrefix(selectedQueryId!),
            first: queryVars.first,
            ...(cursor && { after: cursor })
          }
        )
      } else {
        // No filters - use paginated query for latest reports
        response = await graphqlQuery<AggregateReportsResponse>(
          GET_LATEST_AGGREGATE_REPORTS,
          {
            first: queryVars.first,
            ...(cursor && { after: cursor })
          }
        )
      }
      
      const reports = response.aggregateReports.edges.map(edge => edge.node)
      const mappedReports = mapReportsToOracleFormat(reports)
      
      // Update pagination info only when in pagination mode
      // Otherwise, let loadPaginatedPage handle pagination state updates
      if (isPagination && response.aggregateReports.pageInfo) {
        setHasNextPage(response.aggregateReports.pageInfo.hasNextPage || false)
        setHasPreviousPage(response.aggregateReports.pageInfo.hasPreviousPage || false)
      }
      
      return {
        reports: mappedReports,
        pageInfo: response.aggregateReports.pageInfo,
        edges: response.aggregateReports.edges
      }
    } catch (error) {
      console.error('Error fetching aggregate reports from GraphQL:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: 'Error',
        description: `Failed to fetch aggregate reports: ${errorMessage}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      throw error
    }
  }

  // Keep ref in sync with state (but we also manually set it when needed)
  useEffect(() => {
    isPaginationModeRef.current = isPaginationMode
    console.log('[Ref Sync] Syncing ref with state, isPaginationMode:', isPaginationMode, 'ref now:', isPaginationModeRef.current)
  }, [isPaginationMode])

  // GraphQL polling for aggregate reports
  // Poll ONLY when NOT in pagination mode
  useEffect(() => {
    // Don't poll when in pagination mode at all
    if (isPaginationMode || isPaginationModeRef.current) {
      console.log('[Polling] Effect skipped - in pagination mode', { isPaginationMode, refValue: isPaginationModeRef.current })
      return
    }
    
    console.log('[Polling] Setting up polling effect')
    
    const fetchGraphQLReports = async () => {
      // Double-check ref before proceeding (prevents race condition)
      if (isPaginationModeRef.current) {
        console.log('[Polling] Fetch skipped - ref indicates pagination mode')
        return
      }
      
      try {
        const result = await fetchAggregateReports(null, false)
        
        // Triple-check ref after async operation (prevents race condition)
        if (isPaginationModeRef.current) {
          return
        }
        
        const reports = result.reports
        const rawReports = result.edges.map(edge => edge.node)
        const edges = result.edges
        
        // When using GraphQL-level date filtering, replace all reports instead of merging
        if (isDateFilterEnabled && (fromDate || toDate)) {
          setAggregateReports(reports)
          setProcessedReportIds(new Set(rawReports.map(r => r.id)))
          
          // Always track the last cursor for "load more" functionality
          if (edges.length > 0) {
            const lastCursor = edges[edges.length - 1].cursor
            setLastPollingCursor(lastCursor)
          }
          return
        }
        
        // For non-date-filtered queries, use the existing merge logic
        const newReports = rawReports.filter(report => !processedReportIds.has(report.id))
        
        if (newReports.length === 0) {
          // Still update cursor even if no new reports
          if (edges.length > 0) {
            const lastCursor = edges[edges.length - 1].cursor
            setLastPollingCursor(lastCursor)
          }
          return
        }
        
        const mappedNewReports = mapReportsToOracleFormat(newReports)
        
        setAggregateReports(prev => {
          // Final safety check - if we entered pagination mode during the async operation
          // or during state update, don't merge the data
          if (isPaginationModeRef.current) {
            return prev // Return unchanged state
          }
          
          // Combine new reports with existing, avoiding duplicates by ID
          const existingIds = new Set(prev.map(r => `${r.queryId}-${r.blockHeight}`))
          const trulyNew = mappedNewReports.filter(r => 
            !existingIds.has(`${r.queryId}-${r.blockHeight}`)
          )
          // Keep more reports when date filtering is enabled
          const maxReports = isDateFilterEnabled ? 500 : 100
          const combined = [...trulyNew, ...prev].slice(0, maxReports)
          return combined
        })
        
        // Always track the last cursor from polling for "load more" functionality
        if (edges.length > 0) {
          const lastCursor = edges[edges.length - 1].cursor
          setLastPollingCursor(lastCursor)
        }
        
        setProcessedReportIds(prev => {
          const updated = new Set(prev)
          newReports.forEach(report => updated.add(report.id))
          return updated
        })
      } catch (error) {
        // Error already handled in fetchAggregateReports
      }
    }
    
    // Initial fetch
    fetchGraphQLReports()
    
    // Poll every 3 seconds (only if not filtering by past dates)
    const pollInterval = isDateFilterEnabled && (fromDate || toDate) ? 10000 : 3000
    const interval = setInterval(() => {
      // Check ref before each poll
      if (!isPaginationModeRef.current) {
        fetchGraphQLReports()
      }
    }, pollInterval)
    return () => {
      console.log('[Polling] Cleaning up polling effect, ref value:', isPaginationModeRef.current)
      clearInterval(interval)
    }
  }, [toast, selectedQueryId, isDateFilterEnabled, fromDate, toDate, isPaginationMode, pageSize])

  // Load paginated page
  const loadPaginatedPage = async (cursor: string | null = null) => {
    // Only load paginated data if we're actually in pagination mode
    if (!isPaginationModeRef.current) {
      console.warn('loadPaginatedPage called but not in pagination mode')
      return
    }
    
    try {
      const result = await fetchAggregateReports(cursor, true)
      
      // Double-check we're still in pagination mode after async operation
      if (!isPaginationModeRef.current) {
        return
      }
      
      const reports = result.reports
      const edges = result.edges
      const pageInfo = result.pageInfo
      
      // Replace all reports with paginated results
      setAggregateReports(reports)
      
      // Update pagination info from pageInfo
      if (pageInfo) {
        setHasNextPage(pageInfo.hasNextPage || false)
        setHasPreviousPage(pageInfo.hasPreviousPage || false)
      }
      
      // Track the start cursor of this page (null for page 1, or the cursor used to fetch this page)
      setCurrentPageStartCursor(cursor)
      
      // Update cursor to the end cursor for next page navigation
      // Use endCursor from pageInfo if available, otherwise use last edge's cursor
      if (pageInfo?.endCursor) {
        setCurrentCursor(pageInfo.endCursor)
      } else if (edges.length > 0) {
        const lastCursor = edges[edges.length - 1].cursor
        setCurrentCursor(lastCursor)
      } else {
        setCurrentCursor(null)
      }
    } catch (error) {
      // Error already handled in fetchAggregateReports
    }
  }

  // Handle entering pagination mode
  const handleEnterPaginationMode = async () => {
    // Capture the cursor BEFORE entering pagination mode to prevent race conditions
    const cursorToUse = lastPollingCursor
    
    console.log('[Load More] Entering pagination mode, cursor:', cursorToUse, 'isPaginationMode before:', isPaginationMode, 'ref before:', isPaginationModeRef.current)
    
    // Stop polling immediately by setting pagination mode and updating ref FIRST
    // This must happen before any other state updates to prevent race conditions
    isPaginationModeRef.current = true
    setIsPaginationMode(true)
    
    console.log('[Load More] Ref set to true, checking ref value:', isPaginationModeRef.current)
    
    // Clear current reports and reset pagination state
    setAggregateReports([])
    setPageHistory([])
    setCurrentCursor(null)
    setCurrentPageStartCursor(null)
    setHasNextPage(false)
    setHasPreviousPage(false)
    
    console.log('[Load More] About to load paginated page, ref value:', isPaginationModeRef.current, 'cursor:', cursorToUse)
    
    // Load the next page of older data using the cursor from the last polling query
    // This allows users to seamlessly continue from where the real-time view left off
    // Call immediately - the ref is already set to true
    await loadPaginatedPage(cursorToUse)
    
    console.log('[Load More] Paginated page loaded')
  }

  // Handle exiting pagination mode
  const handleExitPaginationMode = () => {
    // Reset ref to allow polling to resume
    isPaginationModeRef.current = false
    setIsPaginationMode(false)
    setCurrentCursor(null)
    setCurrentPageStartCursor(null)
    setPageHistory([])
    setHasNextPage(false)
    setHasPreviousPage(false)
    // Clear reports and let polling resume
    // Note: We keep lastPollingCursor so it's available for next "Load More"
    setAggregateReports([])
    setProcessedReportIds(new Set())
  }

  // Handle next page
  const handleNextPage = async () => {
    if (!currentCursor) return
    
    // Save the start cursor of the current page to history (for back navigation)
    // This includes null for page 1
    setPageHistory(prev => [...prev, currentPageStartCursor])
    
    await loadPaginatedPage(currentCursor)
  }

  // Handle previous page
  const handlePreviousPage = async () => {
    // If we're on page 1 (currentPageStartCursor is null), can't go back
    if (currentPageStartCursor === null) {
      return
    }
    
    // If we have history, pop the last cursor to go back
    if (pageHistory.length > 0) {
      const newHistory = [...pageHistory]
      const previousCursor = newHistory.pop() || null
      setPageHistory(newHistory)
      await loadPaginatedPage(previousCursor)
    } else {
      // No history but we're not on page 1, go back to page 1
      await loadPaginatedPage(null)
    }
  }

  // Track previous date range state to detect when date range is cleared (not just when pagination mode is set)
  const prevDateRangeRef = useRef<{ isDateFilterEnabled: boolean; hasDateRange: boolean } | null>(null)
  
  // Automatically enable pagination mode when date range is selected (to avoid timeouts)
  // Pagination uses cursors efficiently, preventing the database from scanning entire date ranges
  // When a date range is selected, we use cursor-based pagination instead of polling to avoid
  // database timeouts from scanning large date ranges. Each page only processes 50 records efficiently.
  useEffect(() => {
    const hasDateRange = !!(isDateFilterEnabled && (fromDate || toDate))
    
    // Initialize on first run
    if (prevDateRangeRef.current === null) {
      prevDateRangeRef.current = { isDateFilterEnabled, hasDateRange }
      
      // Enter pagination mode if date range is enabled on mount
      if (hasDateRange && !isPaginationMode) {
        const enterPaginationMode = async () => {
          isPaginationModeRef.current = true
          setIsPaginationMode(true)
          setCurrentCursor(null)
          setCurrentPageStartCursor(null)
          setPageHistory([])
          setHasNextPage(false)
          setHasPreviousPage(false)
          setAggregateReports([])
          setProcessedReportIds(new Set())
          await loadPaginatedPage(null)
        }
        enterPaginationMode()
      }
      return
    }
    
    const prevHasDateRange = prevDateRangeRef.current.hasDateRange
    const dateRangeWasCleared = prevHasDateRange && !hasDateRange
    
    if (hasDateRange && !isPaginationMode) {
      // Automatically enter pagination mode for date ranges
      const enterPaginationMode = async () => {
        isPaginationModeRef.current = true
        setIsPaginationMode(true)
        setCurrentCursor(null)
        setCurrentPageStartCursor(null)
        setPageHistory([])
        setHasNextPage(false)
        setHasPreviousPage(false)
        setAggregateReports([])
        setProcessedReportIds(new Set())
        await loadPaginatedPage(null)
      }
      enterPaginationMode()
    } else if (dateRangeWasCleared && isPaginationMode) {
      // Only exit pagination mode when date range was actually cleared (not when manually entering pagination)
      console.log('[Date Range Effect] Exiting pagination mode - date range was cleared')
      isPaginationModeRef.current = false
      setIsPaginationMode(false)
      setCurrentCursor(null)
      setCurrentPageStartCursor(null)
      setPageHistory([])
      setHasNextPage(false)
      setHasPreviousPage(false)
      setAggregateReports([])
      setProcessedReportIds(new Set())
    }
    
    // Update previous state
    prevDateRangeRef.current = { isDateFilterEnabled, hasDateRange }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDateFilterEnabled, fromDate, toDate])

  // Track previous filter values to detect actual filter changes
  const prevFiltersRef = useRef<{ filterType: typeof filterType; selectedPairName: string; selectedQueryIdInput: string } | null>(null)
  
  // Exit pagination mode when other filters change (but not date range - that's handled above)
  // Only exit if we're in pagination mode AND filters actually changed (not just when pagination mode is set)
  useEffect(() => {
    // Initialize on first run
    if (prevFiltersRef.current === null) {
      prevFiltersRef.current = { filterType, selectedPairName, selectedQueryIdInput }
      console.log('[Filter Exit Effect] Initializing, isPaginationMode:', isPaginationMode)
      return
    }
    
    // Check if filters actually changed
    const filtersChanged = 
      prevFiltersRef.current.filterType !== filterType ||
      prevFiltersRef.current.selectedPairName !== selectedPairName ||
      prevFiltersRef.current.selectedQueryIdInput !== selectedQueryIdInput
    
    console.log('[Filter Exit Effect] Running', {
      filtersChanged,
      isPaginationMode,
      isDateFilterEnabled,
      hasDateRange: !!(isDateFilterEnabled && (fromDate || toDate)),
      prevFilters: prevFiltersRef.current,
      currentFilters: { filterType, selectedPairName, selectedQueryIdInput }
    })
    
    // Only exit pagination mode if filters changed AND we're not using date filtering
    if (filtersChanged && isPaginationMode && !(isDateFilterEnabled && (fromDate || toDate))) {
      console.log('[Filter Exit Effect] EXITING pagination mode')
      isPaginationModeRef.current = false
      setIsPaginationMode(false)
      setCurrentCursor(null)
      setCurrentPageStartCursor(null)
      setPageHistory([])
      setHasNextPage(false)
      setHasPreviousPage(false)
      // Clear reports and let polling resume
      setAggregateReports([])
      setProcessedReportIds(new Set())
    } else {
      console.log('[Filter Exit Effect] NOT exiting pagination mode')
    }
    
    // Update previous filter values
    prevFiltersRef.current = { filterType, selectedPairName, selectedQueryIdInput }
  }, [filterType, selectedPairName, selectedQueryIdInput, isDateFilterEnabled, fromDate, toDate])

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
        // Truncate 0x prefix before storing (GraphQL expects query IDs without 0x)
        const normalizedQueryId = truncateQueryIdPrefix(queryId)
        setSelectedQueryId(normalizedQueryId)
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

  // Filter reports based on selected filters
  // Note: When date filtering is enabled, GraphQL handles the filtering server-side
  // For queryId-only filtering, we still need client-side filtering as a safety check
  const filteredReports = aggregateReports.filter(report => {
    // Apply queryId filter if selected (only needed when not using GraphQL date filtering)
    // When using GraphQL date filtering with queryId, the server already filtered it
    if (selectedQueryId && !(isDateFilterEnabled && (fromDate || toDate))) {
      const reportQueryId = truncateQueryIdPrefix(report.queryId)
      const normalizedSelected = selectedQueryId.toLowerCase()
      const normalizedReport = reportQueryId.toLowerCase()
      
      if (normalizedReport !== normalizedSelected) {
        return false
      }
    }
    
    // When date filtering is enabled, GraphQL already filtered by date
    // So we don't need to do client-side date filtering in that case
    // Only apply client-side date filtering if dates are enabled but GraphQL query didn't include them
    // (This shouldn't happen with the new implementation, but kept as safety check)
    
    return true
  })
  
  // Debug logging (remove in production)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Filter Debug:', {
        totalReports: aggregateReports.length,
        filteredReports: filteredReports.length,
        selectedQueryId,
        isDateFilterEnabled,
        fromDate: fromDate?.toISOString(),
        toDate: toDate?.toISOString(),
        dateRange: dateRange ? { from: dateRange.from?.toISOString(), to: dateRange.to?.toISOString() } : null
      })
    }
  }, [aggregateReports.length, filteredReports.length, selectedQueryId, isDateFilterEnabled, fromDate, toDate, dateRange])


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
        <Box p={4} borderRadius="2xl" mb={4}>
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

        <Box border="1px solid" borderColor={useColorModeValue('border.light', 'border.dark')} borderRadius="2xl" p={4}>
          <HStack mb={4} justify="space-between" align="flex-start">
            <Text fontSize="2xl">
              Aggregate Reports
            </Text>
            <VStack align="flex-end" spacing={3}>
              <RadioGroup 
                value={filterType} 
                onChange={(value) => {
                  setFilterType(value as 'none' | 'pair' | 'queryId')
                  if (value === 'none') {
                    setSelectedPairName('')
                    setSelectedQueryIdInput('')
                    setSelectedQueryId(null)
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
                      // Truncate 0x prefix before storing (GraphQL expects query IDs without 0x)
                      const normalizedQueryId = truncateQueryIdPrefix(cleanedQueryId)
                      setSelectedQueryId(normalizedQueryId)
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
                        // Truncate 0x prefix before storing (GraphQL expects query IDs without 0x)
                        const normalizedQueryId = truncateQueryIdPrefix(cleanedQueryId)
                        setSelectedQueryId(normalizedQueryId)
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
              
              {/* Date Filter Section */}
              <HStack spacing={2} align="center">
                <Checkbox
                  isChecked={isDateFilterEnabled}
                  onChange={(e) => {
                    setIsDateFilterEnabled(e.target.checked)
                    if (!e.target.checked) {
                      setDateRange(undefined)
                    }
                  }}
                >
                  <Text fontSize="sm">Filter by Date</Text>
                </Checkbox>
                {isDateFilterEnabled && (
                  <Popover
                    isOpen={isDatePickerOpen}
                    onClose={() => setIsDatePickerOpen(false)}
                    placement="bottom-end"
                  >
                    <PopoverTrigger>
                      <Button
                        leftIcon={<Icon as={FiCalendar} />}
                        size="sm"
                        variant="outline"
                        onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                        bg={useColorModeValue('white', 'gray.700')}
                      >
                        {dateRange?.from && dateRange?.to
                          ? dateRange.from.getTime() === dateRange.to.getTime()
                            ? format(dateRange.from, 'MMM d, yyyy')
                            : `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                          : dateRange?.from
                          ? `${format(dateRange.from, 'MMM d')} - ...`
                          : 'Select Date Range'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent width="auto" p={4}>
                      <PopoverBody>
                        <VStack spacing={4} align="stretch">
                          <Box>
                            <Text fontSize="sm" fontWeight="semibold" mb={2}>
                              Select Date Range:
                            </Text>
                            <Text fontSize="xs" color="gray.500" mb={2}>
                              Click a date to start, then click another to set the range. Click the same date twice for a single day.
                            </Text>
                            <DayPicker
                              mode="range"
                              selected={dateRange}
                              onSelect={setDateRange}
                              numberOfMonths={1}
                            />
                          </Box>
                          <Flex justify="flex-end" gap={2}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDateRange(undefined)
                              }}
                            >
                              Clear
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="blue"
                              onClick={() => setIsDatePickerOpen(false)}
                            >
                              Apply
                            </Button>
                          </Flex>
                        </VStack>
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                )}
              </HStack>
            </VStack>
          </HStack>
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
                  <Th isNumeric>Block Height</Th>
                  <Th isNumeric>Micro Report Height</Th>
                  <Th>Timestamp</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredReports.map((report, index) => (
                  <Tr key={`${report.queryId}-${report.blockHeight}-${index}`}>
                    <Td>
                      <Text isTruncated maxW="200px" title={report.queryId}>
                        {getQueryPairName(report.queryId, queryIdMappings)}
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
                      {report.totalPower != null
                        ? `${report.totalPower.toLocaleString()} TRB`
                        : '0 TRB'}
                    </Td>
                    <Td>{report.queryType || 'N/A'}</Td>
                    <Td>{report.aggregateMethod || 'N/A'}</Td>
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

          {/* Pagination Controls */}
          {!isPaginationMode ? (
            <Flex justify="center" mt={4}>
              <Button
                onClick={handleEnterPaginationMode}
                colorScheme="blue"
                variant="outline"
              >
                Load More
              </Button>
            </Flex>
          ) : (
            <Flex justify="center" gap={4} mt={4}>
              {/* Only show "Return to live feed" button when NOT filtering by date */}
              {!(isDateFilterEnabled && (fromDate || toDate)) && (
                <Button
                  onClick={handleExitPaginationMode}
                  variant="ghost"
                  size="sm"
                >
                  Return to live feed
                </Button>
              )}
              <Button
                onClick={handlePreviousPage}
                isDisabled={pageHistory.length === 0 && currentPageStartCursor === null}
                colorScheme="blue"
                variant="outline"
                title={pageHistory.length === 0 && currentPageStartCursor === null ? "You are on the first page" : "Go to previous page"}
              >
                Previous
              </Button>
              <Button
                onClick={handleNextPage}
                isDisabled={!hasNextPage || !currentCursor}
                colorScheme="blue"
              >
                Next
              </Button>
            </Flex>
          )}

          {filteredReports.length === 0 && (
            <Text textAlign="center" py={4} color="gray.500">
              {aggregateReports.length === 0
                ? 'Waiting for aggregate reports from GraphQL...'
                : filterType === 'pair' && selectedPairName
                ? `No aggregate reports found for ${selectedPairName}${isDateFilterEnabled && (fromDate || toDate) ? ' in the selected date range' : ''}. Showing ${aggregateReports.length} total reports.`
                : filterType === 'queryId' && selectedQueryId
                ? `No aggregate reports found for query ID ${selectedQueryId}${isDateFilterEnabled && (fromDate || toDate) ? ' in the selected date range' : ''}. Showing ${aggregateReports.length} total reports.`
                : isDateFilterEnabled && (fromDate || toDate)
                ? `No aggregate reports found in the selected date range. Showing ${aggregateReports.length} total reports.`
                : 'No aggregate reports match the current filters.'}
            </Text>
          )}
        </Box>
      </main>
    </>
  )
}

