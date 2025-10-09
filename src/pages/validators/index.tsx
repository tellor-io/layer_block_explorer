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
import { useEffect, useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { SortingState } from '@tanstack/react-table'
import NextLink from 'next/link'
import {
  FiChevronRight,
  FiHome,
  FiCopy,
  FiExternalLink,
  FiMail,
} from 'react-icons/fi'
import { selectTmClient, selectRPCAddress } from '@/store/connectSlice'
import { queryAllValidators } from '@/rpc/abci'
import DataTable from '@/components/Datatable'
import { createColumnHelper } from '@tanstack/react-table'
import {
  convertRateToPercent,
  convertVotingPower,
  isActiveValidator,
} from '@/utils/helper'
import { ColumnDef } from '@tanstack/react-table'
import DelegationPieChart from '@/components/DelegationPieChart'
import { useRouter } from 'next/router'

// Function to fetch delegator count for a validator
const fetchDelegatorCount = async (
  validatorAddress: string,
  rpcAddress: string
): Promise<number> => {
  try {
    const response = await fetch(
      `/api/validator-delegations/${validatorAddress}?rpc=${encodeURIComponent(
        rpcAddress
      )}`
    )
    if (!response.ok) {
      return 0
    }
    const data = await response.json()
    const count = data.delegation_responses?.length || 0
    return count
  } catch (error) {
    console.error('Error fetching delegator count:', error)
    return 0
  }
}

type ValidatorData = {
  operatorAddress: string
  validator: string
  status: number
  votingPower: number
  votingPowerPercentage: string
  commission: string
  delegatorCount: number
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
      const identity = props.row.original.identity
      const website = props.row.original.website
      const details = props.row.original.details
      const securityContact = props.row.original.securityContact
      const toast = useToast()
      const { onCopy: onCopyAddress } = useClipboard(address)
      const { onCopy: onCopyContact } = useClipboard(securityContact || '')
      const { onCopy: onCopyIdentity } = useClipboard(identity || '')

      const hasMetadata = identity || website || details || securityContact

      const handleCopyAddress = () => {
        onCopyAddress()
        toast({
          title: 'Address copied',
          status: 'success',
          duration: 2000,
          isClosable: true,
        })
      }

      const handleCopyContact = () => {
        onCopyContact()
        toast({
          title: 'Contact copied',
          status: 'success',
          duration: 2000,
          isClosable: true,
        })
      }

      const handleCopyIdentity = () => {
        onCopyIdentity()
        toast({
          title: 'Identity copied',
          status: 'success',
          duration: 2000,
          isClosable: true,
        })
      }

      return (
        <div
          data-validator-address={address}
          style={{
            width: '130px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            textAlign: 'left',
          }}
        >
          {hasMetadata ? (
            <Popover
              placement="top"
              trigger="hover"
              openDelay={300}
              closeDelay={300}
            >
              <PopoverTrigger>
                <Text
                  isTruncated
                  cursor="help"
                  _hover={{ textDecoration: 'underline' }}
                >
                  {displayName}
                </Text>
              </PopoverTrigger>
              <PopoverContent p={3} maxW="450px">
                <PopoverBody>
                  <VStack align="start" spacing={2}>
                    <Text fontWeight="bold" fontSize="sm">
                      {displayName}
                    </Text>

                    {identity && (
                      <HStack spacing={2} w="full">
                        <Text fontSize="xs" color="gray.500" minW="60px">
                          Identity:
                        </Text>
                        <Text fontSize="xs" flex={1}>
                          {identity}
                        </Text>
                        <IconButton
                          size="xs"
                          icon={<FiCopy />}
                          aria-label="Copy identity"
                          onClick={handleCopyIdentity}
                          variant="ghost"
                        />
                      </HStack>
                    )}

                    {website && (
                      <HStack spacing={2} w="full">
                        <Text fontSize="xs" color="gray.500" minW="60px">
                          Website:
                        </Text>
                        <Link
                          href={website}
                          isExternal
                          fontSize="xs"
                          color="blue.500"
                          flex={1}
                          _hover={{ textDecoration: 'underline' }}
                        >
                          {website}
                        </Link>
                        <IconButton
                          size="xs"
                          icon={<FiExternalLink />}
                          aria-label="Open website"
                          as="a"
                          href={website}
                          target="_blank"
                          variant="ghost"
                        />
                      </HStack>
                    )}

                    {details && (
                      <HStack spacing={2} w="full" align="start">
                        <Text fontSize="xs" color="gray.500" minW="60px">
                          Details:
                        </Text>
                        <Text fontSize="xs" flex={1}>
                          {details}
                        </Text>
                      </HStack>
                    )}

                    {securityContact && (
                      <HStack spacing={2} w="full">
                        <Text fontSize="xs" color="gray.500" minW="60px">
                          Contact:
                        </Text>
                        <Text fontSize="xs" flex={1}>
                          {securityContact}
                        </Text>
                        <IconButton
                          size="xs"
                          icon={<FiMail />}
                          aria-label="Copy contact"
                          onClick={handleCopyContact}
                          variant="ghost"
                        />
                      </HStack>
                    )}

                    <Divider />

                    <VStack spacing={2} w="full" align="start">
                      <Text fontSize="xs" color="gray.500">
                        Address:
                      </Text>
                      <HStack spacing={2} w="full" align="start">
                        <Text
                          fontSize="xs"
                          fontFamily="mono"
                          flex={1}
                          wordBreak="break-all"
                          maxW="320px"
                        >
                          {address}
                        </Text>
                        <IconButton
                          size="xs"
                          icon={<FiCopy />}
                          aria-label="Copy validator address"
                          onClick={handleCopyAddress}
                          variant="ghost"
                          flexShrink={0}
                        />
                      </HStack>
                    </VStack>
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
            <IconButton
              aria-label="Copy validator address"
              icon={<Icon as={FiCopy} />}
              size="xs"
              variant="ghost"
              onClick={handleCopyAddress}
            />
          </Tooltip>
        </div>
      )
    },
  }),
  columnHelper.accessor('status', {
    header: () => (
      <div style={{ width: '60px', textAlign: 'left' }}>Bond Status</div>
    ),
    cell: (info) => {
      const status = info.getValue()
      // Remove BOND_STATUS_ prefix if present
      const cleanStatus = status.replace(/^BOND_STATUS_/, '')
      return (
        <div style={{ width: '60px', textAlign: 'left' }}>
          <Text fontSize="sm">{cleanStatus}</Text>
        </div>
      )
    },
  }),
  columnHelper.accessor('votingPower', {
    header: () => (
      <div style={{ width: '100px', textAlign: 'left' }}>Tokens</div>
    ),
    cell: (info) => (
      <div style={{ width: '100px', textAlign: 'left' }}>
        <Text>
          {(info.getValue() / 10 ** 6).toLocaleString(undefined, {
            minimumFractionDigits: 6,
            maximumFractionDigits: 6,
          })}{' '}
          TRB{' '}
          <Text as="span" color="gray.500" fontSize="sm">
            ({info.row.original.votingPowerPercentage})
          </Text>
        </Text>
      </div>
    ),
    meta: {
      isNumeric: false,
    },
  }),
  columnHelper.accessor('commission', {
    header: () => (
      <div style={{ width: '87px', textAlign: 'left' }}>Commission</div>
    ),
    cell: (info) => (
      <div style={{ width: '87px', textAlign: 'left' }}>{info.getValue()}</div>
    ),
    meta: {
      isNumeric: false,
    },
  }),
  columnHelper.accessor('delegatorCount', {
    header: () => (
      <div style={{ width: '120px', textAlign: 'center' }}># of Delegators</div>
    ),
    cell: (info) => (
      <div style={{ width: '120px', textAlign: 'center' }}>
        <Text>{info.getValue().toLocaleString()}</Text>
      </div>
    ),
    meta: {
      isNumeric: true,
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.delegatorCount
      const b = rowB.original.delegatorCount
      return a - b
    },
  }),
  columnHelper.accessor('operatorAddress', {
    header: () => (
      <div style={{ width: '500px', textAlign: 'left' }}>
        Delegation Distribution
      </div>
    ),
    cell: (props) => {
      const address = props.getValue()
      return (
        <div style={{ width: '500px', height: '200px', textAlign: 'left' }}>
          <DelegationPieChart
            validatorAddress={address}
            width={400}
            height={180}
          />
        </div>
      )
    },
    enableSorting: false,
  }),
]

interface ValidatorResponse {
  validators: Array<{
    operator_address?: string
    description?: {
      moniker?: string
      identity?: string
      website?: string
      details?: string
      security_contact?: string
    }
    status: number
    tokens: string
    jailed?: boolean
    commission?: {
      commission_rates?: {
        rate?: string
      }
    }
  }>
  pagination?: {
    total: {
      low: number
    }
  }
}

export default function Validators() {
  const router = useRouter()
  const { highlight } = router.query
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(50)
  const [total, setTotal] = useState(0)
  const [allValidators, setAllValidators] = useState<ValidatorData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalVotingPower, setTotalVotingPower] = useState(0)
  const [sorting, setSorting] = useState<SortingState>([])
  const highlightBgColor = useColorModeValue('gray.100', 'gray.700')

  const tmClient = useSelector(selectTmClient)
  const rpcAddress = useSelector(selectRPCAddress)
  const toast = useToast()

  const validatorDataWithPercentage = useMemo(() => {
    if (totalVotingPower === 0) return allValidators
    return allValidators.map((validator) => ({
      ...validator,
      votingPowerPercentage: `${(
        (validator.votingPower / totalVotingPower) *
        100
      ).toFixed(2)}%`,
    }))
  }, [allValidators, totalVotingPower])

  useEffect(() => {
    if (!tmClient) return

    setIsLoading(true)
    const fetchValidators = async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams({
          rpc: rpcAddress,
        })

        // For client-side sorting, we need all data. For server-side sorting, use pagination
        const isClientSideSorting =
          sorting.length > 0 && sorting[0].id === 'delegatorCount'

        if (!isClientSideSorting) {
          params.append('page', page.toString())
          params.append('perPage', perPage.toString())

          // Add sorting parameters if any
          if (sorting.length > 0) {
            const sort = sorting[0]
            params.append('sortBy', sort.id)
            params.append('sortOrder', sort.desc ? 'desc' : 'asc')
          }
        }

        const response = await fetch(`/api/validators?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch validators')
        }
        const data: ValidatorResponse = await response.json()

        if (data.validators) {
          // Fetch delegator counts for all validators
          const validatorsWithDelegatorCounts = await Promise.all(
            data.validators.map(async (validator) => {
              if (!validator.operator_address) {
                throw new Error('Validator missing operator_address')
              }
              const delegatorCount = await fetchDelegatorCount(
                validator.operator_address,
                rpcAddress
              )
              return {
                operatorAddress: validator.operator_address,
                validator:
                  validator.description?.moniker || validator.operator_address,
                identity: validator.description?.identity || '',
                website: validator.description?.website || '',
                details: validator.description?.details || '',
                securityContact: validator.description?.security_contact || '',
                votingPower: parseInt(validator.tokens || '0'),
                votingPowerPercentage: '0%', // Will be calculated below
                commission: convertRateToPercent(
                  validator.commission?.commission_rates?.rate || '0'
                ),
                delegatorCount,
                status: validator.status,
                jailed: validator.jailed || false,
              }
            })
          )

          // Apply client-side sorting if needed
          if (isClientSideSorting) {
            const sort = sorting[0]
            validatorsWithDelegatorCounts.sort((a, b) => {
              const aValue = a.delegatorCount
              const bValue = b.delegatorCount
              const result = aValue - bValue
              return sort.desc ? -result : result
            })
          }

          // Calculate total voting power from all validators (before pagination)
          const totalPower = validatorsWithDelegatorCounts.reduce(
            (sum, validator) => sum + validator.votingPower,
            0
          )
          setTotalVotingPower(totalPower)

          // Apply pagination for client-side sorting
          if (isClientSideSorting) {
            const start = page * perPage
            const end = start + perPage
            const paginatedValidators = validatorsWithDelegatorCounts.slice(
              start,
              end
            )
            setAllValidators(paginatedValidators)
            setTotal(validatorsWithDelegatorCounts.length)
          } else {
            setAllValidators(validatorsWithDelegatorCounts)
            setTotal(data.pagination?.total?.low || data.validators.length)
          }
        }
      } catch (error) {
        console.error('Error fetching validators:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch validators',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchValidators()
  }, [tmClient, rpcAddress, toast, page, perPage, sorting])

  useEffect(() => {
    if (
      !highlight ||
      typeof highlight !== 'string' ||
      allValidators.length === 0
    )
      return

    const tryHighlight = () => {
      const validatorCell = document.querySelector(
        `[data-validator-address="${highlight}"]`
      )

      if (validatorCell) {
        const tableContainer =
          document.querySelector('[role="table"]')?.parentElement
        if (tableContainer) {
          tableContainer.scrollLeft = 0
        }

        const row = validatorCell.closest('tr')
        if (row) {
          validatorCell.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          })

          row.style.backgroundColor = highlightBgColor
          row.style.transition = 'background-color 0.3s ease-in-out'

          setTimeout(() => {
            row.style.backgroundColor = ''
          }, 5000)
        }
      } else {
        setTimeout(tryHighlight, 100)
      }
    }

    tryHighlight()
  }, [highlight, allValidators, highlightBgColor])

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
        <title>Blocks | Tellor Explorer</title>
        <meta name="description" content="Blocks | Tellor Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Validators</Heading>
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
          <Text>Validators</Text>
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
          <DataTable<ValidatorData>
            columns={columns.map((col) => {
              if (
                typeof col === 'object' &&
                'accessorKey' in col &&
                col.accessorKey === 'operatorAddress'
              ) {
                return {
                  ...col,
                  cell: (props: any) => {
                    const address = props.getValue()
                    const cell =
                      typeof col.cell === 'function' ? col.cell(props) : address
                    return (
                      <div
                        id={`validator-${address}`}
                        style={{
                          position: 'relative',
                          padding: '8px',
                          transition: 'background-color 0.3s ease-in-out',
                        }}
                      >
                        {cell}
                      </div>
                    )
                  },
                }
              }
              return col
            })}
            data={validatorDataWithPercentage}
            total={total}
            isLoading={isLoading}
            onChangePagination={onChangePagination}
            onChangeSorting={handleSortingChange}
            serverSideSorting={
              sorting.length === 0 || sorting[0]?.id !== 'delegatorCount'
            }
          />
        </Box>
      </main>
    </>
  )
}
