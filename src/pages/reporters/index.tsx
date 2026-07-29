/**
 * Reporters Page — live RPC for reporter list; selectors via /api/reporter-selectors.
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
import { useEffect, useState, useMemo } from 'react'
import { SortingState } from '@tanstack/react-table'
import NextLink from 'next/link'
import { FiChevronRight, FiHome, FiCopy } from 'react-icons/fi'
import DataTable from '@/components/Datatable'
import { createColumnHelper } from '@tanstack/react-table'
import { fetchLiveReporters, mapReporterToTableRow } from '@/datasources/live/reporters'
import { getReporterSelectors } from '@/rpc/query'

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

const columnHelper = createColumnHelper<ReporterData>()

const columns = [
  columnHelper.accessor('displayName', {
    header: () => <div style={{ width: '130px' }}>Reporter</div>,
    cell: (props) => {
      const id = props.row.original.id
      const displayName = props.getValue()
      const toast = useToast()
      return (
        <div style={{ width: '130px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Text isTruncated title={id}>{displayName}</Text>
          <Tooltip label="Copy reporter ID" hasArrow>
            <IconButton
              aria-label="Copy reporter ID"
              icon={<Icon as={FiCopy} />}
              size="xs"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(id)
                toast({ title: 'ID copied', status: 'success', duration: 2000, isClosable: true })
              }}
            />
          </Tooltip>
        </div>
      )
    },
    sortingFn: (a, b) => a.original.displayName.localeCompare(b.original.displayName),
  }),
  columnHelper.accessor('power', {
    header: () => <div style={{ width: '100px', textAlign: 'left' }}>Power</div>,
    meta: { isNumeric: true },
    cell: (props) => (
      <div style={{ width: '120px', textAlign: 'left' }}>
        {`${Number(props.getValue()).toLocaleString()} TRB`}
      </div>
    ),
    sortingFn: (a, b) => parseFloat(a.original.power) - parseFloat(b.original.power),
  }),
  columnHelper.accessor('min_tokens_required', {
    header: () => <div style={{ width: '100px', textAlign: 'left' }}>Min TRB to Select</div>,
    meta: { isNumeric: true },
    cell: (props) => (
      <div style={{ width: '100px', textAlign: 'left' }}>
        {`${Number(props.getValue()) / 1000000} TRB`}
      </div>
    ),
  }),
  columnHelper.accessor('selectors', {
    header: () => <div style={{ width: '80px', textAlign: 'left' }}>Selectors</div>,
    meta: { isNumeric: true },
    cell: (props) => <div style={{ width: '80px', textAlign: 'left' }}>{props.getValue()}</div>,
    sortingFn: (a, b) => a.original.selectors - b.original.selectors,
  }),
  columnHelper.accessor('commission_rate', {
    header: () => <div style={{ width: '80px', textAlign: 'left' }}>Commsn</div>,
    meta: { isNumeric: true },
    cell: (props) => {
      const percentage = (parseFloat(props.getValue()) / Math.pow(10, 18)) * 100
      return <div style={{ width: '80px', textAlign: 'left' }}>{percentage.toFixed(0) + '%'}</div>
    },
  }),
  columnHelper.accessor('jailed', {
    header: () => <div style={{ width: '60px', textAlign: 'left' }}>Jailed</div>,
    cell: (props) => <div style={{ width: '60px', textAlign: 'left' }}>{props.getValue()}</div>,
  }),
  columnHelper.accessor('jailed_until', {
    header: () => <div style={{ width: '150px', textAlign: 'left' }}>Jailed Until</div>,
    cell: (props) => (
      <div style={{ width: '150px', textAlign: 'left' }}>
        {props.getValue() === '0001-01-01T00:00:00Z' ? 'N/A' : new Date(props.getValue()).toLocaleString()}
      </div>
    ),
  }),
]

async function fetchSelectorsBatch(
  reporters: ReporterData[],
  concurrency = 4,
  onUpdate: (id: string, selectors: number) => void
) {
  const queue = [...reporters]
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const reporter = queue.shift()
      if (!reporter) break
      const selectors = (await getReporterSelectors(reporter.id)) ?? 0
      onUpdate(reporter.id, selectors)
    }
  })
  await Promise.all(workers)
}

export default function Reporters() {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [allData, setAllData] = useState<ReporterData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const toast = useToast()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setIsLoading(true)
        const response = await fetchLiveReporters()
        if (cancelled) return
        const rows = response.reporters.map((r) => mapReporterToTableRow(r))
        setAllData(rows)
        fetchSelectorsBatch(rows, 4, (id, selectors) => {
          if (cancelled) return
          setAllData((prev) =>
            prev.map((r) => (r.id === id ? { ...r, selectors } : r))
          )
        })
      } catch (error) {
        if (!cancelled) {
          toast({
            title: 'Failed to fetch reporters',
            description: error instanceof Error ? error.message : 'Unknown error',
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
          setAllData([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [toast])

  const sortedData = useMemo(() => {
    if (sorting.length === 0) return allData
    const sort = sorting[0]
    return [...allData].sort((a, b) => {
      let aVal: string | number = a[sort.id as keyof ReporterData] as string | number
      let bVal: string | number = b[sort.id as keyof ReporterData] as string | number
      if (sort.id === 'power') {
        aVal = parseFloat(a.power)
        bVal = parseFloat(b.power)
      } else if (sort.id === 'selectors') {
        aVal = a.selectors
        bVal = b.selectors
      } else if (sort.id === 'displayName') {
        aVal = a.displayName
        bVal = b.displayName
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const result = aVal.localeCompare(bVal)
        return sort.desc ? -result : result
      }
      const result = Number(aVal) - Number(bVal)
      return sort.desc ? -result : result
    })
  }, [allData, sorting])

  const data = useMemo(() => {
    const start = pageIndex * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, pageIndex, pageSize])

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
          <Link as={NextLink} href={'/'} style={{ textDecoration: 'none' }} _focus={{ boxShadow: 'none' }} display="flex" justifyContent="center">
            <Icon fontSize="16" color={useColorModeValue('light-theme', 'dark-theme')} as={FiHome} />
          </Link>
          <Icon fontSize="16" as={FiChevronRight} />
          <Text>Reporters</Text>
        </HStack>
        <Box mt={8} bg={useColorModeValue('light-container', 'dark-container')} shadow={'base'} borderRadius={4} p={4} overflowX="auto">
          <DataTable
            columns={columns}
            data={data}
            total={sortedData.length}
            isLoading={isLoading}
            onChangePagination={(value: { pageIndex: number; pageSize: number }) => {
              setPageIndex(value.pageIndex)
              setPageSize(value.pageSize)
            }}
            onChangeSorting={(newSorting) => {
              setSorting(newSorting)
              setPageIndex(0)
            }}
            serverSideSorting={false}
          />
        </Box>
      </main>
    </>
  )
}
