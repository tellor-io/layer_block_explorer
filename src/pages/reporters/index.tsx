/**
 * HYBRID DATA ARCHITECTURE - Reporters Page
 * 
 * This page uses GraphQL for basic reporter data:
 * 
 * GraphQL Data Sources (via /src/datasources/graphql/):
 * - Reporters list (GET_REPORTERS)
 * - Basic reporter information and metadata
 * - Selector counts and commission rates
 * 
 * RPC Data Sources (via /api/ routes):
 * - Reporter-specific queries may use RPC for detailed data
 * - Query-specific reporter counts (/api/reporter-count)
 * - Reporter selectors (/api/reporter-selectors/[reporter])
 * 
 * Migration Notes:
 * - Replaced RPC reporter queries with GraphQL
 * - Added client-side sorting and pagination
 * - Maintained all existing UI/UX functionality
 * - Hybrid approach for comprehensive reporter data
 * - All RPC code preserved in comments for reference
 */

import Head from 'next/head'
import {
  Box,
  Divider,
  HStack,
  Heading,
  Icon,
  Link,
  useColorModeValue,
  Text,
  useToast,
  IconButton,
  Tooltip,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { SortingState } from '@tanstack/react-table'
import NextLink from 'next/link'
import { FiChevronRight, FiHome, FiCopy } from 'react-icons/fi'
import DataTable from '@/components/Datatable'
import { createColumnHelper } from '@tanstack/react-table'
/* RPC imports commented out for GraphQL migration
import { getReporterSelectors } from '@/rpc/query'
import { stripAddressPrefix } from '@/utils/helper'
import { useSelector } from 'react-redux'
import { selectRPCAddress } from '@/store/connectSlice'
*/
// GraphQL imports
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_REPORTERS } from '@/datasources/graphql/queries'
import { ReportersResponse, Reporter, PageInfo } from '@/datasources/graphql/types'

// Update the type to match the GraphQL data structure
type ReporterData = {
  id: string
  displayName: string
  min_tokens_required: string
  commission_rate: string
  jailed: string
  jailed_until: string
  selectors: number
  power: string
}

/* RPC types commented out for GraphQL migration
type APIReporter = {
  address: string
  metadata: {
    min_tokens_required: string
    commission_rate: string
    jailed: boolean
    jailed_until: string
  }
  power: string
  selectors: number
}
*/

const columnHelper = createColumnHelper<ReporterData>()

// Add this helper function at the top of the file
const truncateAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const columns = [
  columnHelper.accessor('displayName', {
    header: () => <div style={{ width: '130px' }}>Reporter</div>,
    cell: (props) => {
      const id = props.row.original.id
      const displayName = props.getValue()
      const toast = useToast()
      return (
        <div
          style={{
            width: '130px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Text isTruncated title={id}>
            {displayName}
          </Text>
          <Tooltip label="Copy reporter ID" hasArrow>
            <IconButton
              aria-label="Copy reporter ID"
              icon={<Icon as={FiCopy} />}
              size="xs"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(id)
                toast({
                  title: 'ID copied',
                  status: 'success',
                  duration: 2000,
                  isClosable: true,
                })
              }}
            />
          </Tooltip>
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.displayName
      const b = rowB.original.displayName
      return a.localeCompare(b)
    },
  }),
  columnHelper.accessor('power', {
    header: () => (
      <div style={{ width: '100px', textAlign: 'left' }}>Power</div>
    ),
    meta: {
      isNumeric: true,
    },
    cell: (props) => (
      <div style={{ width: '120px', textAlign: 'left' }}>
        {`${Number(props.getValue()).toLocaleString()} TRB`}
      </div>
    ),
    sortingFn: (rowA, rowB) => {
      // Convert string values to numbers for comparison
      const a = parseFloat(rowA.original.power)
      const b = parseFloat(rowB.original.power)
      return a - b
    },
  }),
  columnHelper.accessor('min_tokens_required', {
    header: () => (
      <div style={{ width: '100px', textAlign: 'left' }}>Min TRB to Select</div>
    ),
    meta: {
      isNumeric: true,
    },
    cell: (props) => {
      const value = Number(props.getValue()) / 1000000
      return (
        <div style={{ width: '100px', textAlign: 'left' }}>
          {`${value} TRB`}
        </div>
      )
    },
  }),
  columnHelper.accessor('selectors', {
    header: () => (
      <div style={{ width: '80px', textAlign: 'left' }}>Selectors</div>
    ),
    meta: {
      isNumeric: true,
    },
    cell: (props) => (
      <div style={{ width: '80px', textAlign: 'left' }}>{props.getValue()}</div>
    ),
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.selectors
      const b = rowB.original.selectors
      return a - b
    },
  }),
  columnHelper.accessor('commission_rate', {
    header: () => (
      <div style={{ width: '80px', textAlign: 'left' }}>Commsn</div>
    ),
    meta: {
      isNumeric: true,
    },
    cell: (props) => {
      const rawValue = props.getValue()
      // Convert from wei-like units to percentage (divide by 10^18 then multiply by 100)
      const percentage = (parseFloat(rawValue) / Math.pow(10, 18)) * 100
      return (
        <div style={{ width: '80px', textAlign: 'left' }}>
          {percentage.toFixed(0) + '%'}
        </div>
      )
    },
  }),
  columnHelper.accessor('jailed', {
    header: () => (
      <div style={{ width: '60px', textAlign: 'left' }}>Jailed</div>
    ),
    cell: (props) => (
      <div style={{ width: '60px', textAlign: 'left' }}>{props.getValue()}</div>
    ),
  }),
  columnHelper.accessor('jailed_until', {
    header: () => (
      <div style={{ width: '150px', textAlign: 'left' }}>Jailed Until</div>
    ),
    cell: (props) => (
      <div style={{ width: '150px', textAlign: 'left' }}>
        {props.getValue() === '0001-01-01T00:00:00Z'
          ? 'N/A'
          : new Date(props.getValue()).toLocaleString()}
      </div>
    ),
  }),
]

export default function Reporters() {
  // Cursor-based pagination state (similar to blocks page)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [pagesCursors, setPagesCursors] = useState<Array<{ startCursor: string | null; endCursor: string | null }>>([])
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [data, setData] = useState<ReporterData[]>([])
  const [allData, setAllData] = useState<ReporterData[]>([]) // Store all data for client-side sorting
  const [isLoading, setIsLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [powerMap, setPowerMap] = useState<{ [key: string]: string }>({})
  const toast = useToast()

  // Fetch reporter power from RPC
  const fetchReporterPower = async () => {
    try {
      const response = await fetch('/api/reporter-power')
      if (response.ok) {
        const data = await response.json()
        if (data.powerMap) {
          setPowerMap(data.powerMap)
        }
      }
    } catch (error) {
      console.error('Error fetching reporter power:', error)
      // Don't show error toast for power - it's optional data
    }
  }

  // Determine if we need client-side sorting (for power field)
  const needsClientSideSorting = sorting.length > 0 && sorting[0].id === 'power'

  // Build GraphQL orderBy for server-side sorting
  const getOrderBy = (): string[] | undefined => {
    if (sorting.length === 0 || needsClientSideSorting) {
      return undefined
    }
    
    const sort = sorting[0]
    if (sort.id === 'selectors') {
      return sort.desc ? ['SELECTORS_COUNT_DESC'] : ['SELECTORS_COUNT_ASC']
    }
    // Add more server-side sortable fields here if needed
    return undefined
  }

  // Fetch first page
  const fetchFirstPage = async (size: number) => {
    try {
      setIsLoading(true)
      
      // For client-side sorting by power, fetch all data
      const fetchSize = needsClientSideSorting ? 1000 : size
      
      const response = await graphqlQuery<ReportersResponse>(GET_REPORTERS, {
        first: fetchSize,
        orderBy: getOrderBy()
      })
      
      if (response?.reporters?.edges) {
        const reporters = response.reporters.edges.map((edge: any) => edge.node)
        
        // Transform GraphQL data to match component expectations
        const formattedData: ReporterData[] = reporters.map((reporter: Reporter) => ({
          id: reporter.id,
          displayName: reporter.moniker || truncateAddress(reporter.id),
          min_tokens_required: reporter.minTokensRequired,
          commission_rate: reporter.commissionRate,
          jailed: reporter.jailed ? 'Yes' : 'No',
          jailed_until: reporter.jailedUntil === '1970-01-01T00:00:00' ? '0001-01-01T00:00:00Z' : reporter.jailedUntil,
          selectors: reporter.selectors.totalCount,
          power: powerMap[reporter.id] || '0', // Use power from RPC if available
        }))

        // Apply client-side sorting if needed (for power)
        let finalData = formattedData
        if (needsClientSideSorting && sorting.length > 0) {
          finalData = [...formattedData].sort((a, b) => {
            const aPower = parseFloat(a.power || '0')
            const bPower = parseFloat(b.power || '0')
            return sorting[0].desc ? bPower - aPower : aPower - bPower
          })
          // Store all data for client-side pagination
          setAllData(finalData)
          // Paginate the sorted data
          const start = pageIndex * size
          const end = start + size
          finalData = finalData.slice(start, end)
        } else {
          // Clear allData when not doing client-side sorting
          setAllData([])
        }

        setData(finalData)
        setPageInfo(response.reporters.pageInfo)
        
        // Store cursors for page 0 (only if not doing client-side sorting)
        if (!needsClientSideSorting) {
          const cursors = {
            startCursor: response.reporters.pageInfo.startCursor,
            endCursor: response.reporters.pageInfo.endCursor,
          }
          setPagesCursors([cursors])
        } else {
          setPagesCursors([])
        }
      }
    } catch (error) {
      console.error('Error fetching first page:', error)
      toast({
        title: 'Failed to fetch reporters',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch next page
  const fetchNextPage = async (afterCursor: string | null, size: number) => {
    if (!afterCursor) {
      throw new Error('No cursor available for next page')
    }
    
    // Don't fetch next page if doing client-side sorting (all data already loaded)
    if (needsClientSideSorting) {
      return
    }
    
    try {
      setIsLoading(true)
      const response = await graphqlQuery<ReportersResponse>(GET_REPORTERS, {
        first: size,
        after: afterCursor,
        orderBy: getOrderBy()
      })
      
      if (response?.reporters?.edges) {
        const reporters = response.reporters.edges.map((edge: any) => edge.node)
        
        // Transform GraphQL data to match component expectations
        const formattedData: ReporterData[] = reporters.map((reporter: Reporter) => ({
          id: reporter.id,
          displayName: reporter.moniker || truncateAddress(reporter.id),
          min_tokens_required: reporter.minTokensRequired,
          commission_rate: reporter.commissionRate,
          jailed: reporter.jailed ? 'Yes' : 'No',
          jailed_until: reporter.jailedUntil === '1970-01-01T00:00:00' ? '0001-01-01T00:00:00Z' : reporter.jailedUntil,
          selectors: reporter.selectors.totalCount,
          power: powerMap[reporter.id] || '0', // Use power from RPC if available
        }))

        setData(formattedData)
        setPageInfo(response.reporters.pageInfo)
        
        // Store cursors for the new page
        const cursors = {
          startCursor: response.reporters.pageInfo.startCursor,
          endCursor: response.reporters.pageInfo.endCursor,
        }
        setPagesCursors((prev) => [...prev, cursors])
      }
    } catch (error) {
      console.error('Error fetching next page:', error)
      toast({
        title: 'Failed to fetch reporters',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch previous page
  const fetchPrevPage = async (beforeCursor: string | null, size: number) => {
    if (!beforeCursor) {
      throw new Error('No cursor available for previous page')
    }
    
    // Don't fetch previous page if doing client-side sorting (all data already loaded)
    if (needsClientSideSorting) {
      return
    }
    
    try {
      setIsLoading(true)
      const response = await graphqlQuery<ReportersResponse>(GET_REPORTERS, {
        last: size,
        before: beforeCursor,
        orderBy: getOrderBy()
      })
      
      if (response?.reporters?.edges) {
        const reporters = response.reporters.edges.map((edge: any) => edge.node)
        
        // Transform GraphQL data to match component expectations
        const formattedData: ReporterData[] = reporters.map((reporter: Reporter) => ({
          id: reporter.id,
          displayName: reporter.moniker || truncateAddress(reporter.id),
          min_tokens_required: reporter.minTokensRequired,
          commission_rate: reporter.commissionRate,
          jailed: reporter.jailed ? 'Yes' : 'No',
          jailed_until: reporter.jailedUntil === '1970-01-01T00:00:00' ? '0001-01-01T00:00:00Z' : reporter.jailedUntil,
          selectors: reporter.selectors.totalCount,
          power: powerMap[reporter.id] || '0', // Use power from RPC if available
        }))

        setData(formattedData)
        setPageInfo(response.reporters.pageInfo)
      }
    } catch (error) {
      console.error('Error fetching previous page:', error)
      toast({
        title: 'Failed to fetch reporters',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load and when page size or sorting changes
  useEffect(() => {
    fetchReporterPower()
    fetchFirstPage(pageSize)
    setPageIndex(0)
    setPagesCursors([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, sorting])

  // Handle pagination changes (only for server-side sorting)
  useEffect(() => {
    // Skip if doing client-side sorting (handled in fetchFirstPage)
    if (needsClientSideSorting) {
      // For client-side sorting, just update the displayed slice
      return
    }

    // Skip if this is the initial load (handled by pageSize/sorting effect)
    if (pagesCursors.length === 0 && pageIndex === 0) {
      return
    }

    if (pageIndex === 0) {
      // Reset to first page
      fetchFirstPage(pageSize)
      setPagesCursors([])
    } else if (pageIndex > pagesCursors.length - 1) {
      // Fetch next page
      const previousPageCursor = pagesCursors[pageIndex - 1]
      if (previousPageCursor?.endCursor) {
        fetchNextPage(previousPageCursor.endCursor, pageSize)
      }
    } else if (pageIndex < pagesCursors.length && pageIndex > 0) {
      // Go back to a previous page
      const currentPageCursor = pagesCursors[pageIndex]
      if (currentPageCursor?.startCursor) {
        fetchPrevPage(currentPageCursor.startCursor, pageSize)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, needsClientSideSorting])

  // Handle client-side pagination for power sorting
  useEffect(() => {
    if (needsClientSideSorting && allData.length > 0) {
      // Paginate from already-sorted allData
      const start = pageIndex * pageSize
      const end = start + pageSize
      const paginatedData = allData.slice(start, end)
      setData(paginatedData)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, needsClientSideSorting, allData])

  // Update data when power map changes
  useEffect(() => {
    if (Object.keys(powerMap).length > 0) {
      // If sorting by power, we need to re-fetch and re-sort
      if (needsClientSideSorting) {
        fetchFirstPage(pageSize)
      } else if (data.length > 0) {
        // Otherwise, just update the power values in current data
        setData((prevData) =>
          prevData.map((reporter) => ({
            ...reporter,
            power: powerMap[reporter.id] || reporter.power,
          }))
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [powerMap])

  const onChangePagination = (value: {
    pageIndex: number
    pageSize: number
  }) => {
    if (value.pageSize !== pageSize) {
      // Page size changed - reset to first page
      setPageSize(value.pageSize)
      setPageIndex(0)
    } else {
      // Page index changed
      setPageIndex(value.pageIndex)
    }
  }

  const handleSortingChange = (newSorting: SortingState) => {
    setSorting(newSorting)
    setPageIndex(0) // Reset to first page when sorting changes
  }

  // Calculate total based on pageInfo
  // For client-side sorting, use the total count of all fetched data
  const total = needsClientSideSorting
    ? allData.length
    : pageInfo?.hasNextPage 
      ? (pageIndex + 1) * pageSize + 1 // Estimate: current pages + 1 to indicate more
      : (pageIndex * pageSize) + data.length // If no next page, this is the last page

  return (
    <>
      <Head>
        <title>Reporters | Tellor Explorer</title>
        <meta name="description" content="Reporters | Tellor Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Reporters</Heading>
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
          <Text>Reporters</Text>
        </HStack>
        <Box
          mt={8}
          bg={useColorModeValue('light-container', 'dark-container')}
          shadow={'base'}
          borderRadius={4}
          p={4}
          overflowX="auto"
          width={['100%', '100%', '100%', 'auto']}
          sx={{
            '& table': {
              width: 'auto',
              tableLayout: 'fixed',
            },
          }}
        >
          <DataTable
            columns={columns}
            data={data}
            total={total}
            isLoading={isLoading}
            onChangePagination={onChangePagination}
            onChangeSorting={handleSortingChange}
            serverSideSorting={!needsClientSideSorting}
          />
        </Box>
      </main>
    </>
  )
}
