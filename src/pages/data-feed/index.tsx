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
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  Flex,
  Badge,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { FiChevronRight, FiHome, FiSearch, FiRefreshCw } from 'react-icons/fi'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { useGraphQLData } from '@/hooks/useGraphQLData'
import {
  GET_AGGREGATE_REPORTS_PAGINATED,
  SEARCH_AGGREGATE_REPORTS,
} from '@/graphql/queries/oracle'

interface OracleReport {
  id: string
  queryId: string
  queryData?: string
  value: string
  totalReporters: number
  microReportHeight: string
  blockHeight: number
  timestamp: string
  flagged: boolean
  totalPower: string
  cyclist: boolean
  aggregatePower?: string
}

const getQueryPairName = (queryId: string): string => {
  // Remove 0x prefix if present for consistent matching
  const cleanQueryId = queryId.startsWith('0x') ? queryId.slice(2) : queryId

  if (cleanQueryId.endsWith('ad78ac')) return 'BTC/USD'
  if (cleanQueryId.endsWith('ce4992')) return 'ETH/USD'
  if (cleanQueryId.endsWith('67ded0')) return 'TRB/USD'
  if (cleanQueryId.endsWith('aa0f7')) return 'USDC/USD'
  if (cleanQueryId.endsWith('ca264')) return 'USDT/USD'
  if (cleanQueryId.endsWith('ca4ca7')) return 'rETH/USD'
  if (cleanQueryId.endsWith('aa0be')) return 'tBTC/USD'
  if (cleanQueryId.endsWith('5176')) return 'KING/USD'
  if (cleanQueryId.endsWith('e45a')) return 'sUSDS/USD'
  if (cleanQueryId.endsWith('5f3e')) return 'USDN/USD'
  if (cleanQueryId.endsWith('431d')) return 'SAGA/USD'
  if (cleanQueryId.endsWith('318cf')) return 'sUSDe/USD'
  if (cleanQueryId.endsWith('382d')) return 'yUSD/USD'
  if (cleanQueryId.endsWith('ebf2e')) return 'wstETH/USD'
  if (cleanQueryId.endsWith('4f23')) return 'stATOM/USD'
  return queryId
}

export default function DataFeed() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const toast = useToast()

  const limit = 20
  const offset = currentPage * limit

  // GraphQL query for aggregate reports
  const {
    data: aggregateReportsData,
    loading: isLoading,
    error: graphqlError,
    refetch,
  } = useGraphQLData(
    searchTerm ? SEARCH_AGGREGATE_REPORTS : GET_AGGREGATE_REPORTS_PAGINATED,
    searchTerm ? { searchTerm, limit, offset } : { limit, offset }
  )

  const aggregateReports = aggregateReportsData?.aggregateReports || []

  // Handle search functionality
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setCurrentPage(0) // Reset to first page when searching
    setIsSearching(value.length > 0)
  }, [])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch()
    toast({
      title: 'Data Refreshed',
      description: 'Aggregate reports data has been refreshed',
      status: 'success',
      duration: 3000,
      isClosable: true,
    })
  }, [refetch, toast])

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  // Auto-refresh data every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        refetch()
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [isLoading, refetch])

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
          <Flex justify="space-between" align="center" mb={4}>
            <Text fontSize="2xl">Aggregate Reports</Text>
            <Flex gap={2}>
              <Button
                leftIcon={<FiRefreshCw />}
                onClick={handleRefresh}
                isLoading={isLoading}
                size="sm"
                variant="outline"
              >
                Refresh
              </Button>
            </Flex>
          </Flex>

          {/* Search Input */}
          <InputGroup mb={4}>
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search by query ID or value..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </InputGroup>

          {/* Error Display */}
          {graphqlError && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">GraphQL Error:</Text>
                <Text>{graphqlError.message}</Text>
              </Box>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <Flex justify="center" align="center" py={8}>
              <Spinner size="lg" />
              <Text ml={2}>Loading aggregate reports...</Text>
            </Flex>
          )}

          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th isNumeric>Value</Th>
                  <Th isNumeric># Reporters</Th>
                  <Th isNumeric>Total Power</Th>
                  <Th>Status</Th>
                  <Th>Cyclist</Th>
                  <Th isNumeric>Block Height</Th>
                  <Th isNumeric>Micro Report Height</Th>
                  <Th>Timestamp</Th>
                </Tr>
              </Thead>
              <Tbody>
                {aggregateReports.map((report: OracleReport, index: number) => (
                  <Tr key={report.id || index}>
                    <Td>
                      <Text isTruncated maxW="200px" title={report.queryId}>
                        {getQueryPairName(report.queryId)}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      {report.value.startsWith('$')
                        ? report.value
                        : `$${report.value}`}
                    </Td>
                    <Td isNumeric>{report.totalReporters}</Td>
                    <Td isNumeric>
                      {report.totalPower
                        ? `${Number(report.totalPower).toLocaleString()} TRB`
                        : '0 TRB'}
                    </Td>
                    <Td>
                      <Badge colorScheme={report.flagged ? 'red' : 'green'}>
                        {report.flagged ? 'Flagged' : 'Valid'}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={report.cyclist ? 'blue' : 'gray'}>
                        {report.cyclist ? 'Yes' : 'No'}
                      </Badge>
                    </Td>
                    <Td isNumeric>
                      <Link
                        href={`/blocks/${report.blockHeight}`}
                        color="blue.500"
                        isExternal
                      >
                        {Number(report.blockHeight).toLocaleString()}
                        <ExternalLinkIcon mx="2px" />
                      </Link>
                    </Td>
                    <Td isNumeric>{report.microReportHeight}</Td>
                    <Td>{new Date(report.timestamp).toLocaleString()}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>

          {!isLoading && aggregateReports.length === 0 && (
            <Text textAlign="center" py={4} color="gray.500">
              {isSearching
                ? `No aggregate reports found for "${searchTerm}"`
                : 'No aggregate reports available'}
            </Text>
          )}
        </Box>
      </main>
    </>
  )
}
