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
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { FiChevronRight, FiHome } from 'react-icons/fi'
import DataTable from '@/components/Datatable'
import { createColumnHelper } from '@tanstack/react-table'
import { getReporterSelectors } from '@/rpc/query'

// Update the type to match the new data structure
type ReporterData = {
  address: string
  min_tokens_required: string
  commission_rate: string
  jailed: string
  jailed_until: string
  selectors: number
}

// Add this type definition
type APIReporter = {
  address: string
  metadata: {
    min_tokens_required: string
    commission_rate: string
    jailed: boolean
    jailed_until: string
  }
  selectors: number
}

const columnHelper = createColumnHelper<ReporterData>()

const columns = [
  columnHelper.accessor('address', {
    header: 'Address',
    cell: (props) => (
      <div
        style={{ width: '205px', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {props.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor('min_tokens_required', {
    header: 'Min Tokens Reqd',
    meta: {
      isNumeric: true,
    },
    cell: (props) => (
      <div style={{ width: '70px', textAlign: 'right' }}>
        {props.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor('commission_rate', {
    header: 'Commission',
    meta: {
      isNumeric: true,
    },
    cell: (props) => {
      const rawValue = props.getValue()
      const percentage = parseFloat(rawValue) * 100000000000000
      return (
        <div style={{ width: '60px', textAlign: 'right' }}>
          {percentage.toFixed(2) + '%'}
        </div>
      )
    },
  }),
  columnHelper.accessor('jailed', {
    header: 'Jailed',
    cell: (props) => <div style={{ width: '50px' }}>{props.getValue()}</div>,
  }),
  columnHelper.accessor('jailed_until', {
    header: 'Jailed Until',
    cell: (props) => (
      <div style={{ width: '30px' }}>
        {props.getValue() === '0001-01-01T00:00:00Z'
          ? 'N/A'
          : new Date(props.getValue()).toLocaleString()}
      </div>
    ),
  }),
  columnHelper.accessor('selectors', {
    header: 'Selectors',
    meta: {
      isNumeric: true,
    },
    cell: (props) => (
      <div style={{ width: '30px', textAlign: 'right' }}>
        {props.getValue()}
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
  const toast = useToast()

  useEffect(() => {
    setIsLoading(true)
    const url = '/api/reporters'

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((responseData) => {
        if (responseData.reporters && Array.isArray(responseData.reporters)) {
          setTotal(
            parseInt(responseData.pagination.total) ||
              responseData.reporters.length
          )
          const reporterAddresses = responseData.reporters.map(
            (reporter: APIReporter) => reporter.address
          )

          // Fetch selectors for all reporters
          return Promise.all(
            reporterAddresses.map((address: string) =>
              getReporterSelectors(address)
            )
          ).then((selectorsData) => {
            const formattedData = responseData.reporters.map(
              (reporter: APIReporter, index: number) => ({
                address: reporter.address,
                min_tokens_required: reporter.metadata.min_tokens_required,
                commission_rate: reporter.metadata.commission_rate,
                jailed: reporter.metadata.jailed ? 'Yes' : 'No',
                jailed_until: reporter.metadata.jailed_until,
                selectors: selectorsData[index] ?? 0,
              })
            )
            const start = page * perPage
            const end = start + perPage
            const paginatedData = formattedData.slice(start, end)
            setData(paginatedData)
          })
        } else {
          throw new Error('Unexpected data structure')
        }
      })
      .then(() => setIsLoading(false))
      .catch((error) => {
        console.error('Error fetching reporters data:', error)
        toast({
          title: 'Failed to fetch reporters data',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        setIsLoading(false)
      })
  }, [page, perPage, toast])

  const onChangePagination = (value: {
    pageIndex: number
    pageSize: number
  }) => {
    setPage(value.pageIndex)
    setPerPage(value.pageSize)
  }

  return (
    <>
      <Head>
        <title>Reporters | Layer Explorer</title>
        <meta name="description" content="Reporters | Layer Explorer" />
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
              minWidth: '100%',
              width: 'max-content',
            },
          }}
        >
          <DataTable
            columns={columns}
            data={data}
            total={total}
            isLoading={isLoading}
            onChangePagination={onChangePagination}
          />
        </Box>
      </main>
    </>
  )
}
