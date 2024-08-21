import Head from 'next/head'
import {
  Box,
  Divider,
  HStack,
  Heading,
  Icon,
  Link,
  Text,
  useToast,
  useColorModeValue,
  Tag,
  Badge,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import NextLink from 'next/link'
import { FiChevronRight, FiHome } from 'react-icons/fi'
import { selectTmClient } from '@/store/connectSlice'
import { queryProposals, queryProposalVotes } from '@/rpc/abci'
import DataTable from '@/components/Datatable'
import { createColumnHelper } from '@tanstack/react-table'
import { getTypeMsg, displayDate } from '@/utils/helper'
import { proposalStatus, proposalStatusList } from '@/utils/constant'
import { decodeContentProposal } from '@/encoding'

type Proposal = {
  id: number
  title: string
  types: string
  status: proposalStatus | undefined
  votingEnd: string
  voteResults: {
    hasVotes: boolean
    voteDistribution: {
      yes: { value: number; percentage: string }
      no: { value: number; percentage: string }
      abstain: { value: number; percentage: string }
      veto: { value: number; percentage: string }
    } | null
    totalPower: number
  }
}

const columnHelper = createColumnHelper<Proposal>()

const columns = [
  columnHelper.accessor('id', {
    cell: (info) => `#${info.getValue()}`,
    header: '#ID',
  }),
  columnHelper.accessor('title', {
    cell: (info) => info.getValue(),
    header: 'Title',
  }),
  columnHelper.accessor('types', {
    cell: (info) => <Tag colorScheme="cyan">{info.getValue()}</Tag>,
    header: 'Types',
  }),
  columnHelper.accessor('status', {
    cell: (info) => {
      const value = info.getValue()
      if (!value) {
        return ''
      }
      return <Badge colorScheme={value.color}>{value.status}</Badge>
    },
    header: 'Status',
  }),
  columnHelper.accessor('votingEnd', {
    cell: (info) => info.getValue(),
    header: 'Voting End',
  }),
  columnHelper.accessor('voteResults', {
    cell: (info) => {
      const voteResults = info.getValue()
      if (!voteResults.hasVotes) {
        return <Text>No votes recorded</Text>
      }
      const { yes, no, abstain, veto } = voteResults.voteDistribution!
      return (
        <VStack align="start" spacing={1}>
          <Text fontWeight="bold">
            Total Power:{' '}
            {voteResults.totalPower.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })}
          </Text>
          <Text>
            Yes:{' '}
            {yes.value.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
            ({yes.percentage}%)
          </Text>
          <Text>
            No:{' '}
            {no.value.toLocaleString(undefined, { maximumFractionDigits: 6 })} (
            {no.percentage}%)
          </Text>
          <Text>
            Abstain:{' '}
            {abstain.value.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })}{' '}
            ({abstain.percentage}%)
          </Text>
          <Text>
            Veto:{' '}
            {veto.value.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
            ({veto.percentage}%)
          </Text>
        </VStack>
      )
    },
    header: 'Vote Results',
  }),
]

export default function Proposals() {
  const tmClient = useSelector(selectTmClient)
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    if (tmClient) {
      setIsLoading(true)
      queryProposals(tmClient, page, perPage)
        .then(async (response) => {
          setTotal(response.pagination?.total.low ?? 0)
          const proposalsList: Proposal[] = await Promise.all(
            response.proposals.map(async (val) => {
              const votingEnd = val.votingEndTime?.nanos
                ? new Date(val.votingEndTime?.seconds.low * 1000).toISOString()
                : null
              const content = decodeContentProposal(
                val.content?.typeUrl ?? '',
                val.content?.value ?? new Uint8Array()
              )
              const voteResults = await queryProposalVotes(
                tmClient,
                val.proposalId.low
              )
              console.log(
                `Vote results for proposal ${val.proposalId.low}:`,
                voteResults
              )

              return {
                id: val.proposalId.low,
                title: content.data?.title ?? '',
                types: getTypeMsg(val.content?.typeUrl ?? ''),
                status: proposalStatusList.find(
                  (item) => item.id === Number(val.status.toString())
                ),
                votingEnd: votingEnd ? displayDate(votingEnd) : '',
                voteResults: voteResults,
              }
            })
          )
          setProposals(proposalsList)
          setIsLoading(false)
        })
        .catch(() => {
          toast({
            title: 'Failed to fetch datatable',
            description: '',
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
        })
    }
  }, [tmClient, page, perPage])

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
        <title>Proposals | Layer Explorer</title>
        <meta name="description" content="Proposals | Layer Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Proposals</Heading>
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
          <Text>Proposals</Text>
        </HStack>
        <Box
          mt={8}
          bg={useColorModeValue('light-container', 'dark-container')}
          shadow={'base'}
          borderRadius={4}
          p={4}
        >
          <DataTable
            columns={columns}
            data={proposals}
            total={total}
            isLoading={isLoading}
            onChangePagination={onChangePagination}
          />
        </Box>
      </main>
    </>
  )
}
