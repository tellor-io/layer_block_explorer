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
import NextLink from 'next/link'
import { FiChevronRight, FiHome, FiCopy } from 'react-icons/fi'
import DataTable from '@/components/Datatable'
import { createColumnHelper } from '@tanstack/react-table'
import { getReporterSelectors } from '@/rpc/query'
import { stripAddressPrefix } from '@/utils/helper'

// Update the type to match the new data structure
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

// Add this type definition
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
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    setIsLoading(true)
    const url = '/api/reporters'

    // Add timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    })

    // First fetch validators
    Promise.race([fetch('/api/validators'), timeoutPromise])
      .then((response: unknown) => {
        if (!(response instanceof Response)) {
          throw new Error('Expected Response object')
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((validatorData) => {
        const validatorMap = new Map()
        if (validatorData.validators) {
          validatorData.validators.forEach((validator: any) => {
            const strippedValAddress = stripAddressPrefix(
              validator.operator_address
            )
            // Store using first 33 characters of the stripped address
            const addressKey = strippedValAddress
              .replace(/^valoper/, '')
              .substring(0, 33)
            validatorMap.set(addressKey, validator.description?.moniker)
          })
        }

        // Then fetch reporters
        return fetch(url)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            return response.json()
          })
          .then((responseData) => {
            if (
              responseData.reporters &&
              Array.isArray(responseData.reporters)
            ) {
              setTotal(
                parseInt(responseData.pagination?.total) ||
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
                  (reporter: APIReporter, index: number) => {
                    const strippedReporterAddress = stripAddressPrefix(
                      reporter.address
                    )
                    // Use first 33 characters for lookup
                    const lookupKey = strippedReporterAddress.substring(0, 33)
                    const validatorMoniker = validatorMap.get(lookupKey)

                    return {
                      address: reporter.address,
                      displayName:
                        validatorMoniker || truncateAddress(reporter.address),
                      min_tokens_required:
                        reporter.metadata.min_tokens_required,
                      commission_rate: reporter.metadata.commission_rate,
                      jailed: reporter.metadata.jailed ? 'Yes' : 'No',
                      jailed_until: reporter.metadata.jailed_until,
                      selectors: selectorsData[index] ?? 0,
                      power: reporter.power || '0',
                    }
                  }
                )
                const start = page * perPage
                const end = start + perPage
                const paginatedData = formattedData.slice(start, end)
                setData(paginatedData)
                setIsLoading(false) // Success case
              })
            } else {
              throw new Error('Unexpected data structure')
            }
          })
      })
      .catch((error) => {
        console.error('Error fetching data:', error)
        toast({
          title: 'Failed to fetch data',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        setData([]) // Clear data on error
        setIsLoading(false) // Make sure to clear loading state on error
      })

    // Cleanup function
    return () => {
      setIsLoading(false)
    }
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
          />
        </Box>
      </main>
    </>
  )
}
