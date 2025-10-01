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
    console.log(`[PROD DEBUG] Frontend: Fetching delegator count for ${validatorAddress}`)
    console.log(`[PROD DEBUG] Frontend: RPC address: ${rpcAddress}`)
    const response = await fetch(
      `/api/validator-delegations/${validatorAddress}?rpc=${encodeURIComponent(
        rpcAddress
      )}`
    )
    console.log(`[PROD DEBUG] Frontend: Response status: ${response.status}`)
    if (!response.ok) {
      console.log(`[PROD DEBUG] Frontend: Response not ok, returning 0`)
      return 0
    }
    const data = await response.json()
    const count = data.delegation_responses?.length || 0
    console.log(`[PROD DEBUG] Frontend: Got ${count} delegators`)
    return count
  } catch (error) {
    console.error('Error fetching delegator count:', error)
    return 0
  }
}

type ValidatorData = {
  operatorAddress: string
  validator: string
  status: string
  votingPower: number
  votingPowerPercentage: string
  commission: string
  delegatorCount: number
  identity?: string
  website?: string
  details?: string
  securityContact?: string
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
      <div style={{ width: '60px', textAlign: 'left' }}>Status</div>
    ),
    cell: (info) => (
      <div style={{ width: '60px', textAlign: 'left' }}>{info.getValue()}</div>
    ),
  }),
  columnHelper.accessor('votingPower', {
    header: () => (
      <div style={{ width: '100px', textAlign: 'left' }}>Voting Power</div>
    ),
    cell: (info) => (
      <div style={{ width: '100px', textAlign: 'left' }}>
        <Text>
          {info.getValue().toLocaleString()}{' '}
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
  }),
]

interface ValidatorResponse {
  validators: Array<{
    operatorAddress?: string
    description?: {
      moniker?: string
      identity?: string
      website?: string
      details?: string
      security_contact?: string
    }
    status: number
    tokens: string
    commission?: {
      commissionRates?: {
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
    queryAllValidators(tmClient)
      .then(async (response: ValidatorResponse) => {
        const validators = response.validators
        const activeValidators = validators.filter((val) =>
          isActiveValidator(val.status)
        )
        const totalPower = activeValidators.reduce(
          (sum, val) => sum + convertVotingPower(val.tokens),
          0
        )
        setTotalVotingPower(totalPower)
        setTotal(response.pagination?.total.low ?? 0)

        const validatorData: ValidatorData[] = validators.map((val) => ({
          operatorAddress: val.operatorAddress ?? '',
          validator: val.description?.moniker ?? '',
          status: isActiveValidator(val.status) ? 'Active' : 'Inactive',
          votingPower: convertVotingPower(val.tokens),
          votingPowerPercentage: '',
          commission: convertRateToPercent(
            val.commission?.commissionRates?.rate
          ),
          delegatorCount: 0, // Will be fetched below
          identity: val.description?.identity,
          website: val.description?.website,
          details: val.description?.details,
          securityContact: val.description?.security_contact,
        }))

        // Fetch delegator counts for all validators
        const validatorsWithDelegatorCounts = await Promise.all(
          validatorData.map(async (validator) => {
            const delegatorCount = await fetchDelegatorCount(
              validator.operatorAddress,
              rpcAddress
            )
            return {
              ...validator,
              delegatorCount,
            }
          })
        )

        setAllValidators(validatorsWithDelegatorCounts)
        setIsLoading(false)
      })
      .catch((error: Error) => {
        console.error('Error fetching validators:', error)
        toast({
          title: 'Failed to fetch validators',
          description: '',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        setIsLoading(false)
      })
  }, [tmClient, toast])

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
          />
        </Box>
      </main>
    </>
  )
}
