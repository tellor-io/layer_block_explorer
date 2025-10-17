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
  Input,
  InputGroup,
  InputLeftElement,
  VStack,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { SortingState } from '@tanstack/react-table'
import NextLink from 'next/link'
import { FiChevronRight, FiHome, FiCopy, FiSearch } from 'react-icons/fi'
import DataTable from '@/components/Datatable'
import { createColumnHelper } from '@tanstack/react-table'
import { stripAddressPrefix } from '@/utils/helper'
import { useGraphQLData } from '@/hooks/useGraphQLData'
import {
  GET_REPORTERS_PAGINATED,
  SEARCH_REPORTERS,
} from '@/graphql/queries/reporters'
import { GraphQLReporter } from '@/services/graphqlService'

// Update the type to match the GraphQL data structure
type ReporterData = {
  address: string
  displayName: string
  min_tokens_required: string
  commission_rate: string
  jailed: string
  jailed_until: string
  selectors: number
  power: string
}

// GraphQL response type
interface GraphQLReportersResponse {
  reporters: GraphQLReporter[]
}

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
      const address = props.row.original.address
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
          <Text isTruncated title={address}>
            {displayName}
          </Text>
          <Tooltip label="Copy reporter address" hasArrow>
            <IconButton
              aria-label="Copy reporter address"
              icon={<Icon as={FiCopy} />}
              size="xs"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(address)
                toast({
                  title: 'Address copied',
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
      const percentage = parseFloat(rawValue) * 100
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
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchTerm, setSearchTerm] = useState('')
  const toast = useToast()

  // GraphQL data fetching
  const {
    data: graphqlData,
    loading: isLoading,
    error: graphqlError,
    refetch,
  } = useGraphQLData<GraphQLReportersResponse>(
    searchTerm ? SEARCH_REPORTERS : GET_REPORTERS_PAGINATED,
    searchTerm
      ? { searchTerm, limit: 100, offset: 0 }
      : { limit: perPage, offset: page * perPage },
    {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    }
  )

  // Process GraphQL data when it changes
  useEffect(() => {
    if (graphqlData?.reporters) {
      const formattedData = graphqlData.reporters.map(
        (reporter: GraphQLReporter) => {
          return {
            address: reporter.id,
            displayName: reporter.moniker || truncateAddress(reporter.id),
            min_tokens_required: reporter.minTokensRequired,
            commission_rate: reporter.commissionRate,
            jailed: reporter.jailed ? 'Yes' : 'No',
            jailed_until: reporter.jailedUntil,
            selectors: 0, // TODO: Implement selector fetching from GraphQL
            power: '0', // TODO: Implement power calculation from GraphQL
          }
        }
      )

      // Apply client-side sorting if needed
      const isClientSideSorting =
        sorting.length > 0 &&
        (sorting[0].id === 'displayName' || sorting[0].id === 'selectors')

      if (isClientSideSorting) {
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

        // Apply pagination for client-side sorting
        const start = page * perPage
        const end = start + perPage
        const paginatedData = formattedData.slice(start, end)
        setData(paginatedData)
        setTotal(formattedData.length)
      } else {
        setData(formattedData)
        setTotal(formattedData.length)
      }
    }
  }, [graphqlData, page, perPage, sorting])

  // Handle GraphQL errors
  useEffect(() => {
    if (graphqlError) {
      console.error('GraphQL error:', graphqlError)
      toast({
        title: 'Failed to fetch reporters data',
        description: graphqlError.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }, [graphqlError, toast])

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

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    setPage(0) // Reset to first page when searching
  }

  const handleRefresh = () => {
    refetch()
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
        <VStack spacing={4} align="stretch">
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

          {/* Search and Controls */}
          <HStack spacing={4} justify="space-between" wrap="wrap">
            <InputGroup maxW="400px">
              <InputLeftElement pointerEvents="none">
                <Icon as={FiSearch} color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search reporters by moniker or address..."
                value={searchTerm}
                onChange={handleSearchChange}
                bg={useColorModeValue('white', 'gray.700')}
              />
            </InputGroup>

            <HStack spacing={2}>
              <Badge
                colorScheme={isLoading ? 'blue' : 'green'}
                variant="subtle"
              >
                {isLoading ? 'Loading...' : 'GraphQL'}
              </Badge>
              <IconButton
                aria-label="Refresh data"
                icon={<Icon as={FiChevronRight} />}
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                isLoading={isLoading}
              />
            </HStack>
          </HStack>

          {/* Error Display */}
          {graphqlError && (
            <Alert status="error">
              <AlertIcon />
              <Text fontSize="sm">GraphQL Error: {graphqlError.message}</Text>
            </Alert>
          )}
        </VStack>

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
