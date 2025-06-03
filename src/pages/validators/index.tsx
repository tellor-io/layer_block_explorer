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
} from '@chakra-ui/react'
import { useEffect, useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import NextLink from 'next/link'
import { FiChevronRight, FiHome, FiCopy } from 'react-icons/fi'
import { selectTmClient } from '@/store/connectSlice'
import { queryAllValidators } from '@/rpc/abci'
import DataTable from '@/components/Datatable'
import { createColumnHelper } from '@tanstack/react-table'
import { convertRateToPercent, convertVotingPower } from '@/utils/helper'
import { ColumnDef } from '@tanstack/react-table'
import DelegationPieChart from '@/components/DelegationPieChart'
import { useRouter } from 'next/router'

type ValidatorData = {
  operatorAddress: string
  validator: string
  status: string
  votingPower: number
  votingPowerPercentage: string
  commission: string
}

const columnHelper = createColumnHelper<ValidatorData>()

const columns: ColumnDef<ValidatorData, any>[] = [
  columnHelper.accessor('validator', {
    header: () => <div style={{ width: '130px', textAlign: 'left' }}>Validator</div>,
    cell: (props) => {
      const address = props.row.original.operatorAddress
      const displayName = props.getValue()
      const toast = useToast()
      return (
        <div
          data-validator-address={address}
          style={{
            width: '130px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            textAlign: 'left'
          }}
        >
          <Text isTruncated title={address}>
            {displayName}
          </Text>
          <Tooltip label="Copy validator address" hasArrow>
            <IconButton
              aria-label="Copy validator address"
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
  columnHelper.accessor('status', {
    header: () => <div style={{ width: '100px', textAlign: 'left' }}>Status</div>,
    cell: (info) => <div style={{ width: '100px', textAlign: 'left' }}>{info.getValue()}</div>,
  }),
  columnHelper.accessor('votingPower', {
    header: () => <div style={{ width: '150px', textAlign: 'left' }}>Voting Power</div>,
    cell: (info) => (
      <div style={{ width: '150px', textAlign: 'left' }}>
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
    header: () => <div style={{ width: '100px', textAlign: 'left' }}>Commission</div>,
    cell: (info) => <div style={{ width: '100px', textAlign: 'left' }}>{info.getValue()}</div>,
    meta: {
      isNumeric: false,
    },
  }),
  columnHelper.accessor('operatorAddress', {
    header: () => <div style={{ width: '500px', textAlign: 'left' }}>Delegation Distribution</div>,
    cell: (props) => {
      const address = props.getValue()
      return (
        <div style={{ width: '500px', height: '200px', textAlign: 'left' }}>
          <DelegationPieChart validatorAddress={address} width={400} height={180} />
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
      .then((response: ValidatorResponse) => {
        const validators = response.validators
        const totalPower = validators.reduce(
          (sum, val) => sum + convertVotingPower(val.tokens),
          0
        )
        setTotalVotingPower(totalPower)
        setTotal(response.pagination?.total.low ?? 0)

        const validatorData: ValidatorData[] = validators.map((val) => ({
          operatorAddress: val.operatorAddress ?? '',
          validator: val.description?.moniker ?? '',
          status: val.status === 3 ? 'Active' : 'Inactive',
          votingPower: convertVotingPower(val.tokens),
          votingPowerPercentage: '',
          commission: convertRateToPercent(
            val.commission?.commissionRates?.rate
          ),
        }))
        setAllValidators(validatorData)
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
    if (!highlight || typeof highlight !== 'string' || allValidators.length === 0) return
    
    const tryHighlight = () => {
      const validatorCell = document.querySelector(`[data-validator-address="${highlight}"]`)
      
      if (validatorCell) {
        const tableContainer = document.querySelector('[role="table"]')?.parentElement
        if (tableContainer) {
          tableContainer.scrollLeft = 0
        }
        
        const row = validatorCell.closest('tr')
        if (row) {
          validatorCell.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
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
            }
          }}
        >
          <DataTable<ValidatorData>
            columns={columns.map(col => {
              if (typeof col === 'object' && 'accessorKey' in col && col.accessorKey === 'operatorAddress') {
                return {
                  ...col,
                  cell: (props: any) => {
                    const address = props.getValue()
                    const cell = typeof col.cell === 'function' ? col.cell(props) : address
                    return (
                      <div 
                        id={`validator-${address}`}
                        style={{ 
                          position: 'relative',
                          padding: '8px',
                          transition: 'background-color 0.3s ease-in-out'
                        }}
                      >
                        {cell}
                      </div>
                    )
                  }
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
