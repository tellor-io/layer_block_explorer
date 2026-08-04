/**
 * Validators Page — live RPC for stake/status; tiered delegation loading.
 */

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
  useToast,
  IconButton,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  VStack,
  Button,
  useClipboard,
} from '@chakra-ui/react'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { SortingState } from '@tanstack/react-table'
import NextLink from 'next/link'
import {
  FiChevronRight,
  FiHome,
  FiCopy,
  FiExternalLink,
  FiMail,
} from 'react-icons/fi'
import DataTable from '@/components/Datatable'
import { createColumnHelper, ColumnDef } from '@tanstack/react-table'
import { isActiveValidator } from '@/utils/helper'
import DelegationPieChart from '@/components/DelegationPieChart'
import { useRouter } from 'next/router'
import { useLiveValidators } from '@/datasources/live/useLiveValidators'
import { mapValidatorToTableRow } from '@/datasources/live/validators'
import { stakingCache } from '@/datasources/live/stakingCache'

type ValidatorData = {
  operatorAddress: string
  validator: string
  status: number
  votingPower: number
  votingPowerPercentage: string
  commission: string
  delegatorCount: number | null
  identity?: string
  website?: string
  details?: string
  securityContact?: string
  jailed?: boolean
}

const columnHelper = createColumnHelper<ValidatorData>()

const columns: ColumnDef<ValidatorData, any>[] = [
  columnHelper.accessor('validator', {
    header: () => (
      <div style={{ width: '130px', textAlign: 'left' }}>Validator</div>
    ),
    cell: (props) => {
      const address = props.row.original.operatorAddress
      const displayName = props.getValue()
      const { identity, website, details, securityContact } = props.row.original
      const toast = useToast()
      const { onCopy: onCopyAddress } = useClipboard(address)
      const { onCopy: onCopyContact } = useClipboard(securityContact || '')
      const { onCopy: onCopyIdentity } = useClipboard(identity || '')
      const hasMetadata = identity || website || details || securityContact

      const handleCopyAddress = () => {
        onCopyAddress()
        toast({ title: 'Address copied', status: 'success', duration: 2000, isClosable: true })
      }

      return (
        <div
          data-validator-address={address}
          style={{ width: '130px', display: 'flex', alignItems: 'center', gap: '4px', textAlign: 'left' }}
        >
          {hasMetadata ? (
            <Popover placement="top" trigger="hover" openDelay={300} closeDelay={300}>
              <PopoverTrigger>
                <Text isTruncated cursor="help" _hover={{ textDecoration: 'underline' }}>
                  {displayName}
                </Text>
              </PopoverTrigger>
              <PopoverContent p={3} maxW="450px">
                <PopoverBody>
                  <VStack align="start" spacing={2}>
                    <Text fontWeight="bold" fontSize="sm">{displayName}</Text>
                    {identity && (
                      <HStack spacing={2} w="full">
                        <Text fontSize="xs" color="gray.500" minW="60px">Identity:</Text>
                        <Text fontSize="xs" flex={1}>{identity}</Text>
                        <IconButton size="xs" icon={<FiCopy />} aria-label="Copy identity" onClick={() => { onCopyIdentity(); toast({ title: 'Identity copied', status: 'success', duration: 2000, isClosable: true }) }} variant="ghost" />
                      </HStack>
                    )}
                    {website && (
                      <HStack spacing={2} w="full">
                        <Text fontSize="xs" color="gray.500" minW="60px">Website:</Text>
                        <Link href={website} isExternal fontSize="xs" color="blue.500" flex={1}>{website}</Link>
                      </HStack>
                    )}
                    {details && (
                      <HStack spacing={2} w="full" align="start">
                        <Text fontSize="xs" color="gray.500" minW="60px">Details:</Text>
                        <Text fontSize="xs" flex={1}>{details}</Text>
                      </HStack>
                    )}
                    {securityContact && (
                      <HStack spacing={2} w="full">
                        <Text fontSize="xs" color="gray.500" minW="60px">Contact:</Text>
                        <Text fontSize="xs" flex={1}>{securityContact}</Text>
                        <IconButton size="xs" icon={<FiMail />} aria-label="Copy contact" onClick={() => { onCopyContact(); toast({ title: 'Contact copied', status: 'success', duration: 2000, isClosable: true }) }} variant="ghost" />
                      </HStack>
                    )}
                    <Divider />
                    <Text fontSize="xs" color="gray.500">Address:</Text>
                    <HStack spacing={2} w="full">
                      <Text fontSize="xs" fontFamily="mono" flex={1} wordBreak="break-all">{address}</Text>
                      <IconButton size="xs" icon={<FiCopy />} aria-label="Copy address" onClick={handleCopyAddress} variant="ghost" />
                    </HStack>
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          ) : (
            <Tooltip label={`Copy validator address: ${address}`} hasArrow>
              <Text isTruncated>{displayName}</Text>
            </Tooltip>
          )}
          <Tooltip label="Copy validator address" hasArrow>
            <IconButton aria-label="Copy validator address" icon={<Icon as={FiCopy} />} size="xs" variant="ghost" onClick={handleCopyAddress} />
          </Tooltip>
        </div>
      )
    },
  }),
  columnHelper.accessor('status', {
    header: () => <div style={{ width: '110px', textAlign: 'left' }}>Bond Status</div>,
    cell: (info) => {
      const status = info.getValue()
      const labels: Record<number, string> = { 0: 'UNSPECIFIED', 1: 'UNBONDED', 2: 'UNBONDING', 3: 'BONDED' }
      return (
        <div style={{ width: '110px', textAlign: 'left' }}>
          <Text fontSize="sm">{labels[status] || 'UNKNOWN'}</Text>
        </div>
      )
    },
    sortingFn: (a, b) => a.original.status - b.original.status,
    enableSorting: true,
  }),
  columnHelper.accessor('votingPower', {
    header: () => <div style={{ width: '100px', textAlign: 'left' }}>Tokens</div>,
    cell: (info) => (
      <div style={{ width: '100px', textAlign: 'left' }}>
        <Text>
          {(info.getValue() / 10 ** 6).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}{' '}
          TRB{' '}
          <Text as="span" color="gray.500" fontSize="sm">({info.row.original.votingPowerPercentage})</Text>
        </Text>
      </div>
    ),
    sortingFn: (a, b) => a.original.votingPower - b.original.votingPower,
    enableSorting: true,
  }),
  columnHelper.accessor('commission', {
    header: () => <div style={{ width: '87px', textAlign: 'left' }}>Commission</div>,
    cell: (info) => <div style={{ width: '87px', textAlign: 'left' }}>{info.getValue()}</div>,
  }),
  columnHelper.accessor('delegatorCount', {
    header: () => <div style={{ width: '120px', textAlign: 'center' }}># of Delegators</div>,
    cell: (info) => {
      const count = info.getValue()
      return (
        <div style={{ width: '120px', textAlign: 'center' }}>
          <Text>{count == null ? '—' : count.toLocaleString()}</Text>
        </div>
      )
    },
    sortingFn: (a, b) => (a.original.delegatorCount ?? -1) - (b.original.delegatorCount ?? -1),
    enableSorting: true,
  }),
  columnHelper.accessor('operatorAddress', {
    header: () => <div style={{ width: '500px', textAlign: 'left' }}>Delegation Distribution</div>,
    cell: (props) => (
      <div style={{ width: '500px', height: '200px', textAlign: 'left' }}>
        <DelegationPieChart validatorAddress={props.getValue()} width={400} height={180} />
      </div>
    ),
    enableSorting: false,
  }),
]

const clientSideSortableColumns = ['delegatorCount', 'status', 'votingPower']

export default function Validators() {
  const router = useRouter()
  const { highlight } = router.query
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(10)
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'votingPower', desc: true },
  ])
  const [delegatorCounts, setDelegatorCounts] = useState<Map<string, number>>(new Map())
  const [countsLoading, setCountsLoading] = useState(true)
  const highlightBgColor = useColorModeValue('gray.100', 'gray.700')
  const toast = useToast()

  const { validators: liveValidators, isLoading, error, refresh } = useLiveValidators()

  const baseRows = useMemo(
    () =>
      liveValidators.map((v) =>
        mapValidatorToTableRow(v, delegatorCounts.get(v.operatorAddress) ?? null)
      ),
    [liveValidators, delegatorCounts]
  )

  const totalVotingPower = useMemo(
    () => baseRows.reduce((sum, v) => sum + v.votingPower, 0),
    [baseRows]
  )

  const sortedRows = useMemo(() => {
    const rows = baseRows.map((v) => ({
      ...v,
      votingPowerPercentage:
        totalVotingPower === 0
          ? '0%'
          : `${((v.votingPower / totalVotingPower) * 100).toFixed(2)}%`,
    }))

    if (sorting.length === 0) return rows
    const sort = sorting[0]
    if (!clientSideSortableColumns.includes(sort.id)) return rows

    return [...rows].sort((a, b) => {
      let aVal: number
      let bVal: number
      if (sort.id === 'delegatorCount') {
        aVal = a.delegatorCount ?? -1
        bVal = b.delegatorCount ?? -1
      } else if (sort.id === 'status') {
        aVal = a.status
        bVal = b.status
      } else {
        aVal = a.votingPower
        bVal = b.votingPower
      }
      const result = aVal - bVal
      return sort.desc ? -result : result
    })
  }, [baseRows, sorting, totalVotingPower])

  const displayValidators = useMemo(() => {
    const start = page * perPage
    return sortedRows.slice(start, start + perPage)
  }, [sortedRows, page, perPage])

  const loadDelegatorCounts = useCallback(
    async (addresses: string[], visibleFirst = false) => {
      setCountsLoading(true)
      const ordered = visibleFirst
        ? [
            ...addresses.slice(page * perPage, page * perPage + perPage),
            ...addresses.filter(
              (_, i) => i < page * perPage || i >= page * perPage + perPage
            ),
          ]
        : addresses

      await stakingCache.fetchDelegatorCountsBatch(ordered, 4, (address, count) => {
        setDelegatorCounts((prev) => new Map(prev).set(address, count))
      })
      setCountsLoading(false)
    },
    [page, perPage]
  )

  useEffect(() => {
    if (!liveValidators.length) return
    const addresses = liveValidators.map((v) => v.operatorAddress)
    loadDelegatorCounts(addresses, true)
    const interval = setInterval(() => loadDelegatorCounts(addresses), 60_000)
    return () => clearInterval(interval)
  }, [liveValidators, loadDelegatorCounts])

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }, [error, toast])

  useEffect(() => {
    if (!highlight || typeof highlight !== 'string' || displayValidators.length === 0) return
    const tryHighlight = () => {
      const cell = document.querySelector(`[data-validator-address="${highlight}"]`)
      if (cell) {
        const row = cell.closest('tr')
        if (row) {
          cell.scrollIntoView({ behavior: 'smooth', block: 'center' })
          row.style.backgroundColor = highlightBgColor
          setTimeout(() => { row.style.backgroundColor = '' }, 5000)
        }
      } else {
        setTimeout(tryHighlight, 100)
      }
    }
    tryHighlight()
  }, [highlight, displayValidators, highlightBgColor])

  const delegatorSortDisabled = countsLoading && sorting[0]?.id === 'delegatorCount'

  return (
    <>
      <Head>
        <title>Validators | Tellor Explorer</title>
        <meta name="description" content="Validators | Tellor Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Validators</Heading>
          <Divider borderColor={'gray'} size="10px" orientation="vertical" />
          <Link as={NextLink} href={'/'} style={{ textDecoration: 'none' }} _focus={{ boxShadow: 'none' }} display="flex" justifyContent="center">
            <Icon fontSize="16" color={useColorModeValue('light-theme', 'dark-theme')} as={FiHome} />
          </Link>
          <Icon fontSize="16" as={FiChevronRight} />
          <Text>Validators</Text>
          <Button size="xs" ml="auto" onClick={() => refresh()}>Refresh</Button>
        </HStack>
        {delegatorSortDisabled && (
          <Text fontSize="sm" color="gray.500" mt={2}>Loading delegator counts…</Text>
        )}
        <Box mt={8} bg={useColorModeValue('light-container', 'dark-container')} border="1px solid" borderColor={useColorModeValue('border.light', 'border.dark')} borderRadius="2xl" p={4} overflowX="auto">
          <DataTable<ValidatorData>
            columns={columns}
            data={displayValidators}
            total={sortedRows.length}
            isLoading={isLoading && !liveValidators.length}
            initialSorting={[{ id: 'votingPower', desc: true }]}
            onChangePagination={(value: { pageIndex: number; pageSize: number }) => {
              setPage(value.pageIndex)
              setPerPage(value.pageSize)
            }}
            onChangeSorting={(newSorting) => {
              if (countsLoading && newSorting[0]?.id === 'delegatorCount') return
              setSorting(newSorting)
              setPage(0)
            }}
            serverSideSorting={false}
          />
        </Box>
      </main>
    </>
  )
}
