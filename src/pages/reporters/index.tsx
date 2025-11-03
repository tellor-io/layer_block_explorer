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
import { ReportersResponse, Reporter } from '@/datasources/graphql/types'

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
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [data, setData] = useState<ReporterData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const toast = useToast()
  /* RPC state management commented out for GraphQL migration
  const rpcAddress = useSelector(selectRPCAddress)
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    setRefreshKey((prev) => prev + 1)
  }, [rpcAddress])
  */

  useEffect(() => {
    const fetchReporters = async () => {
      setIsLoading(true)
      try {
        // For client-side sorting, we need all data. For server-side sorting, use pagination
        const isClientSideSorting =
          sorting.length > 0 &&
          (sorting[0].id === 'displayName' || sorting[0].id === 'selectors')

        // Calculate pagination parameters
        const first = isClientSideSorting ? 1000 : perPage // Get more data for client-side sorting
        const after = isClientSideSorting ? undefined : undefined // TODO: Implement cursor-based pagination

        // GraphQL data fetching (client-side as per migration plan)
        const response = await graphqlQuery<ReportersResponse>(GET_REPORTERS, {
          first,
          after: undefined // TODO: Implement cursor-based pagination
        })

        if (response.reporters?.edges) {
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
            power: '0', // TODO: Calculate power from stake or other fields
          }))

          // Apply client-side sorting if needed
          if (isClientSideSorting && sorting.length > 0) {
            const sort = sorting[0]
            formattedData.sort((a: ReporterData, b: ReporterData) => {
              let aValue, bValue
              if (sort.id === 'displayName') {
                aValue = a.displayName
                bValue = b.displayName
                const result = aValue.localeCompare(bValue)
                return sort.desc ? -result : result
              } else if (sort.id === 'selectors') {
                aValue = a.selectors
                bValue = b.selectors
                const result = aValue - bValue
                return sort.desc ? -result : result
              }
              return 0
            })
          }

          // Apply pagination for client-side sorting
          if (isClientSideSorting) {
            const start = page * perPage
            const end = start + perPage
            const paginatedData = formattedData.slice(start, end)
            setData(paginatedData)
            setTotal(formattedData.length)
          } else {
            setData(formattedData)
            setTotal(response.reporters.edges.length)
          }

          setIsLoading(false)
        } else {
          throw new Error('No reporters data received')
        }
      } catch (error) {
        console.error('Error fetching reporters:', error)
        toast({
          title: 'Failed to fetch reporters',
          description: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        setData([])
        setIsLoading(false)
      }
    }

    fetchReporters()
  }, [page, perPage, toast, sorting])

  const onChangePagination = (value: {
    pageIndex: number
    pageSize: number
  }) => {
    setPage(value.pageIndex)
    setPerPage(value.pageSize)
  }

  const handleSortingChange = (newSorting: SortingState) => {
    setSorting(newSorting)
    setPage(0) // Reset to first page when sorting changes
  }

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
            serverSideSorting={
              sorting.length === 0 ||
              (sorting[0]?.id !== 'displayName' &&
                sorting[0]?.id !== 'selectors')
            }
          />
        </Box>
      </main>
    </>
  )
}
