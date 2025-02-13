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
    header: () => <div style={{ width: '130px' }}>Validator</div>,
    cell: (props) => {
      const address = props.row.original.operatorAddress
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
    cell: (info) => info.getValue(),
    header: 'Status',
  }),
  columnHelper.accessor('votingPower', {
    cell: (info) => (
      <Text>
        {info.getValue().toLocaleString()}{' '}
        <Text as="span" color="gray.500" fontSize="sm">
          ({info.row.original.votingPowerPercentage})
        </Text>
      </Text>
    ),
    header: 'Voting Power',
    meta: {
      isNumeric: true,
    },
  }),
  columnHelper.accessor('commission', {
    cell: (info) => info.getValue(),
    header: 'Commission',
    meta: {
      isNumeric: true,
    },
  }),
]

export default function Validators() {
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [data, setData] = useState<ValidatorData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalVotingPower, setTotalVotingPower] = useState(0)

  const tmClient = useSelector(selectTmClient)
  const toast = useToast()

  const validatorDataWithPercentage = useMemo(() => {
    if (totalVotingPower === 0) return data
    return data.map((validator) => ({
      ...validator,
      votingPowerPercentage: `${(
        (validator.votingPower / totalVotingPower) *
        100
      ).toFixed(2)}%`,
    }))
  }, [data, totalVotingPower])

  useEffect(() => {
    if (tmClient) {
      setIsLoading(true)

      // First, fetch the total voting power across all validators
      queryAllValidators(tmClient)
        .then((response) => {
          const allValidators = response.validators
          const totalPower = allValidators.reduce(
            (sum, val) => sum + convertVotingPower(val.tokens),
            0
          )
          setTotalVotingPower(totalPower)

          // Now fetch the paginated data
          return queryAllValidators(tmClient)
        })
        .then((response) => {
          setTotal(response.pagination?.total.low ?? 0)
          const validatorData: ValidatorData[] = response.validators
            .slice(page * perPage, (page + 1) * perPage)
            .map((val) => ({
              operatorAddress: val.operatorAddress ?? '',
              validator: val.description?.moniker ?? '',
              status: val.status === 3 ? 'Active' : 'Inactive',
              votingPower: convertVotingPower(val.tokens),
              votingPowerPercentage: '', // This will be calculated in useMemo
              commission: convertRateToPercent(
                val.commission?.commissionRates?.rate
              ),
            }))
          setData(validatorData)
          setIsLoading(false)
        })
        .catch((error) => {
          console.error('Error fetching validators:', error)
          toast({
            title: 'Failed to fetch datatable',
            description: '',
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
        })
    }
  }, [tmClient, page, perPage, toast])

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
        <title>Blocks | Layer Explorer</title>
        <meta name="description" content="Blocks | Layer Explorer" />
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
            columns={columns}
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
