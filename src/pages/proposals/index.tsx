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
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSelector } from 'react-redux'
import NextLink from 'next/link'
import { FiChevronRight, FiHome } from 'react-icons/fi'
import { selectTmClient, selectRPCAddress } from '@/store/connectSlice'
import { queryProposals, queryProposalVotes } from '@/rpc/abci'
import DataTable from '@/components/Datatable'
import { createColumnHelper } from '@tanstack/react-table'
import { getTypeMsg, displayDate } from '@/utils/helper'
import { proposalStatus, proposalStatusList } from '@/utils/constant'
import { decodeContentProposal } from '@/encoding'
import { useClipboard, Tooltip } from '@chakra-ui/react'
import { FiCopy } from 'react-icons/fi'

const CopyableTitle = ({ title }: { title: string }) => {
  const { hasCopied, onCopy } = useClipboard(title)

  return (
    <Tooltip
      label={hasCopied ? 'Copied!' : 'Click to copy full title'}
      closeOnClick={false}
    >
      <HStack spacing={1} cursor="pointer" onClick={onCopy}>
        <Text
          maxWidth="200px"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {title}
        </Text>
        <Icon as={FiCopy} boxSize={4} />
      </HStack>
    </Tooltip>
  )
}

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
    cell: (info) => <CopyableTitle title={info.getValue()} />,
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
          <Text>
            <strong>Total Power:</strong>{' '}
            {voteResults.totalPower.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })}
          </Text>
          <Text>
            <strong>Yes:</strong>{' '}
            {yes.value.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
            ({yes.percentage}%)
          </Text>
          <Text>
            <strong>No:</strong>{' '}
            {no.value.toLocaleString(undefined, { maximumFractionDigits: 6 })} (
            {no.percentage}%)
          </Text>
          <Text>
            <strong>Abstain:</strong>{' '}
            {abstain.value.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })}{' '}
            ({abstain.percentage}%)
          </Text>
          <Text>
            <strong>Veto:</strong>{' '}
            {veto.value.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
            ({veto.percentage}%)
          </Text>
        </VStack>
      )
    },
    header: 'Vote Results',
  }),
]

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  return String(error)
}

export default function Proposals() {
  const tmClient = useSelector(selectTmClient)
  const rpcAddress = useSelector(selectRPCAddress)
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()
  const isFetchingRef = useRef(false)
  const mountedRef = useRef(true)

  const fetchProposals = useCallback(async () => {
    if (!tmClient || isFetchingRef.current || !mountedRef.current) {
      return
    }

    try {
      isFetchingRef.current = true
      const response = await queryProposals(tmClient, page, perPage)

      if (!mountedRef.current) return

      setTotal(response.pagination?.total.low ?? 0)

      const proposalsList = await Promise.all(
        response.proposals.map(async (val) => {
          const votingEnd = val.votingEndTime?.nanos
            ? new Date(val.votingEndTime?.seconds.low * 1000).toISOString()
            : null

          let title = ''
          let type = ''
          try {
            if (!val.content?.value || val.content.value.length === 0) {
              title = 'Untitled Proposal'
              type = 'Unknown Type'
            } else {
              const content = decodeContentProposal(
                val.content?.typeUrl ?? '',
                val.content?.value
              )
              title = content.data?.title ?? 'Untitled Proposal'
              type = getTypeMsg(val.content?.typeUrl ?? '')
            }
          } catch (error) {
            title = 'Untitled Proposal'
            type = 'Unknown Type'
          }

          const voteResults = await queryProposalVotes(
            tmClient,
            val.proposalId.low
          )

          return {
            id: val.proposalId.low,
            title,
            types: type,
            status: proposalStatusList.find(
              (item) => item.id === Number(val.status.toString())
            ),
            votingEnd: votingEnd ? displayDate(votingEnd) : '',
            voteResults: voteResults,
          }
        })
      )

      if (!mountedRef.current) return

      setProposals(proposalsList)
    } catch (error) {
      if (!mountedRef.current) return
      toast({
        title: 'Failed to fetch datatable',
        description: getErrorMessage(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
      isFetchingRef.current = false
    }
  }, [tmClient, page, perPage, toast])

  useEffect(() => {
    mountedRef.current = true
    setIsLoading(true)
    fetchProposals()

    return () => {
      mountedRef.current = false
      isFetchingRef.current = false
    }
  }, [fetchProposals])

  const onChangePagination = useCallback(
    (value: { pageIndex: number; pageSize: number }) => {
      if (value.pageIndex !== page || value.pageSize !== perPage) {
        setPage(value.pageIndex)
        setPerPage(value.pageSize)
      }
    },
    [page, perPage]
  )

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
