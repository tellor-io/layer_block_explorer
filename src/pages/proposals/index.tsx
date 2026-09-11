/**
 * HYBRID DATA ARCHITECTURE - Proposals Page
 *
 * Indexer (GraphQL): proposal list, tally results (incl. totalPower at vote time), quorum threshold %
 * Quorum % / Quorum Met use tallyResults.totalPower (historical), not live staking.
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
  useToast,
  useColorModeValue,
  Tag,
  Badge,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { selectRPCAddress } from '@/store/connectSlice'
import NextLink from 'next/link'
import { FiChevronRight, FiHome } from 'react-icons/fi'
// GraphQL imports
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_GOV_PROPOSALS, GET_GOV_QUORUM } from '@/datasources/graphql/queries'
import { GovProposalsResponse, GovProposal, PageInfo } from '@/datasources/graphql/types'
import DataTable from '@/components/Datatable'
import { createColumnHelper } from '@tanstack/react-table'
import {
  getTypeMsg,
  displayDate,
  convertRateToPercent,
  convertVotingPower,
} from '@/utils/helper'
import {
  proposalStatus,
  proposalStatusList,
  GOV_PARAMS_TYPE,
} from '@/utils/constant'
import { decodeContentProposal } from '@/encoding'
import { useClipboard, Tooltip } from '@chakra-ui/react'
import { FiInfo } from 'react-icons/fi'
import { fromUtf8 } from '@cosmjs/encoding'
import ProposalTooltip from '@/components/ProposalTooltip'

type GovQuorumResponse = {
  govParams?: {
    edges?: Array<{
      node?: {
        quorum?: string
      }
    }>
  }
}

const CopyableTitle = ({
  title,
  proposalId,
}: {
  title: string
  proposalId: number
}) => {
  const { hasCopied, onCopy } = useClipboard(title)

  return (
    <ProposalTooltip proposalId={proposalId}>
      <HStack spacing={1} cursor="pointer" onClick={onCopy}>
        <Text
          maxWidth="200px"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {title}
        </Text>
        <Icon as={FiInfo} boxSize={4} />
      </HStack>
    </ProposalTooltip>
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
    totalPower: number // Total votes cast (normalized) // Total possible power from JSON (normalized)
  }
  quorum: {
    required: string
    met: boolean
    percentage: string
  }
}

const columnHelper = createColumnHelper<Proposal>()

const columns = [
  columnHelper.accessor('id', {
    cell: (info) => `#${info.getValue()}`,
    header: '#ID',
  }),
  columnHelper.accessor('title', {
    cell: (info) => (
      <CopyableTitle
        title={info.getValue()}
        proposalId={info.row.original.id}
      />
    ),
    header: 'Title',
  }),
  columnHelper.accessor('types', {
    cell: (info) => {
      const type = info.getValue()
      return <Tag colorScheme="cyan">{type || 'Unknown'}</Tag>
    },
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
      const proposal = info.row.original

      if (!voteResults.hasVotes) {
        return <Text>No votes recorded</Text>
      }

      const { yes, no, abstain, veto } = voteResults.voteDistribution!
      return (
        <VStack align="start" spacing={1}>
          <Text>
            <strong>Power:</strong>{' '}
            {voteResults.totalPower.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })}
          </Text>
          <Text>
            <strong>% of Total Power:</strong> {proposal.quorum.percentage}
          </Text>
          <Text>
            <strong>Quorum Met?</strong>{' '}
            <Badge colorScheme={proposal.quorum.met ? 'green' : 'red'}>
              {proposal.quorum.met ? 'Yes' : 'No'}
            </Badge>{' '}
            ({proposal.quorum.required})
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
  const rpcAddress = useSelector(selectRPCAddress)
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quorumRequired, setQuorumRequired] = useState<string>('')
  const [quorumReady, setQuorumReady] = useState(false)
  const quorumRequiredRef = useRef<string>('')
  const toast = useToast()
  const isFetchingRef = useRef(false)
  const mountedRef = useRef(true)
  // Cursor-based pagination state
  const [pagesCursors, setPagesCursors] = useState<Array<{ startCursor: string | null; endCursor: string | null }>>([])
  const pagesCursorsRef = useRef<Array<{ startCursor: string | null; endCursor: string | null }>>([])
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  
  // Keep refs in sync with state
  useEffect(() => {
    pagesCursorsRef.current = pagesCursors
  }, [pagesCursors])
  
  useEffect(() => {
    quorumRequiredRef.current = quorumRequired
  }, [quorumRequired])


  // GraphQL: quorum threshold % only (total power comes from each proposal's tallyResults)
  const fetchQuorumRequirement = useCallback(async () => {
    try {
      const paramsResponse = await graphqlQuery<GovQuorumResponse>(GET_GOV_QUORUM)

      if (paramsResponse?.govParams?.edges?.[0]?.node?.quorum) {
        const quorumValue = paramsResponse.govParams.edges[0].node.quorum
        const quorumPercent = (parseFloat(quorumValue) * 100).toFixed(2)
        const quorumStr = `${quorumPercent}%`
        quorumRequiredRef.current = quorumStr
        setQuorumRequired(quorumStr)
      } else {
        quorumRequiredRef.current = '33.40%'
        setQuorumRequired('33.40%')
      }
    } catch (error) {
      console.error('Error fetching quorum requirement:', error)
      quorumRequiredRef.current = '33.40%'
      setQuorumRequired('33.40%')
    }
  }, [])


  // GraphQL: Fetch first page (page 0) - pure data fetcher
  const fetchFirstPage = useCallback(async (size: number): Promise<GovProposalsResponse> => {
    const response = await graphqlQuery<GovProposalsResponse>(GET_GOV_PROPOSALS, {
      first: size
    })
    return response
  }, [])

  // GraphQL: Fetch next page - pure data fetcher
  const fetchNextPage = useCallback(async (afterCursor: string | null, size: number): Promise<GovProposalsResponse> => {
    if (!afterCursor) {
      throw new Error('No cursor available for next page')
    }
    
    const response = await graphqlQuery<GovProposalsResponse>(GET_GOV_PROPOSALS, {
      first: size,
      after: afterCursor
    })
    return response
  }, [])


  // GraphQL: Fetch proposals with pagination
  const fetchProposals = useCallback(async () => {
    // Quorum threshold must already be loaded so Quorum Met? is not "Unknown".
    if (
      isFetchingRef.current ||
      !mountedRef.current ||
      !quorumRequiredRef.current
    ) {
      return
    }

    try {
      isFetchingRef.current = true
      setIsLoading(true)
      setError(null)

      let response: GovProposalsResponse
      const currentCursors = pagesCursorsRef.current

      if (page === 0) {
        // First page - always fetch fresh
        response = await fetchFirstPage(perPage)
      } else if (page > currentCursors.length - 1) {
        // We're going forward to a new page that we haven't visited yet
        const lastPageIndex = currentCursors.length - 1
        const lastPageCursors = currentCursors[lastPageIndex]
        if (!lastPageCursors?.endCursor) {
          throw new Error('No cursor available for next page')
        }
        response = await fetchNextPage(lastPageCursors.endCursor, perPage)
      } else {
        // We're going back to a page we've visited before
        const prevPageCursors = currentCursors[page - 1]
        if (!prevPageCursors?.endCursor) {
          // Fallback: if we don't have the previous page's cursor, go to first page
          response = await fetchFirstPage(perPage)
        } else {
          // Fetch forward from the previous page's end cursor
          response = await fetchNextPage(prevPageCursors.endCursor, perPage)
        }
      }

      if (!mountedRef.current || !response) return

      // Update page info and cursors
      setPageInfo(response.govProposals.pageInfo)

      // Update cursors based on current page
      if (page === 0) {
        // Store cursors for page 0
        const cursors = {
          startCursor: response.govProposals.pageInfo.startCursor,
          endCursor: response.govProposals.pageInfo.endCursor,
        }
        setPagesCursors([cursors])
      } else if (page > currentCursors.length - 1) {
        // Store cursors for new page
        const cursors = {
          startCursor: response.govProposals.pageInfo.startCursor,
          endCursor: response.govProposals.pageInfo.endCursor,
        }
        setPagesCursors((prev) => [...prev, cursors])
      } else {
        // Update cursors for existing page (going back)
        const updatedCursors = {
          startCursor: response.govProposals.pageInfo.startCursor,
          endCursor: response.govProposals.pageInfo.endCursor,
        }
        setPagesCursors((prev) => {
          const newCursors = [...prev]
          newCursors[page] = updatedCursors
          return newCursors
        })
      }

      // Update total estimate
      if (response.govProposals.pageInfo.hasNextPage) {
        // Still more pages, keep large estimate or increase it
        setTotal((prev) => Math.max(prev, (page + 1) * perPage + 1))
      } else {
        // This is the last page, calculate total accurately
        setTotal((page + 1) * perPage)
      }

      const proposalsList = response.govProposals.edges.map((edge: any) => {
        const proposal = edge.node
        
        // Parse voting end time
        const votingEnd = proposal.votingEndTime 
          ? displayDate(proposal.votingEndTime) 
          : ''

        // Parse proposal type from messages
        let type = 'Unknown Type'
        try {
          if (proposal.messages && proposal.messages.trim()) {
            // Messages field is a comma-separated string of message type URLs
            const messageTypes = proposal.messages.split(',').map((msg: string) => msg.trim()).filter((msg: string) => msg.length > 0)
            if (messageTypes.length > 0) {
              // Extract type name from message type URL (e.g., "/cosmos.gov.v1beta1.MsgVote" -> "Vote")
              const firstMessageType = messageTypes[0]
              // Try getTypeMsg first (handles type URLs like "/cosmos.gov.v1beta1.MsgVote")
              type = getTypeMsg(firstMessageType)
              
              // If getTypeMsg didn't work, try extracting from the string directly
              if (!type || type === '') {
                const parts = firstMessageType.split('.')
                if (parts.length > 0) {
                  const lastPart = parts[parts.length - 1]
                  // Remove "Msg" prefix if present and clean up
                  type = lastPart.replace(/^Msg/, '').replace(/^msg/, '') || lastPart
                } else {
                  // If no dots, use the whole string (might already be a type name)
                  type = firstMessageType.replace(/^Msg/, '').replace(/^msg/, '')
                }
              }
              
              // If still empty, use the raw message type
              if (!type || type === '') {
                type = firstMessageType
              }
            }
          } else {
            // If messages is empty, try to get type from title or other fields
            console.warn(`Proposal ${proposal.proposalId} has no messages field`)
          }
        } catch (error) {
          console.warn('Failed to parse proposal messages for proposal', proposal.proposalId, error, 'messages:', proposal.messages)
        }

        // Map GraphQL status string to proposal status
        // GraphQL statuses: 'proposal_deposit_period', 'proposal_voting_period', 'proposal_passed', 'proposal_rejected', 'proposal_failed', 'proposal_dropped', 'PROPOSAL_STATUS_VOTING_PERIOD'
        // proposalStatusList statuses: 'DEPOSIT PERIOD', 'VOTING PERIOD', 'PASSED', 'REJECTED', 'FAILED'
        const statusMap: Record<string, string> = {
          'proposal_deposit_period': 'DEPOSIT PERIOD',
          'proposal_voting_period': 'VOTING PERIOD',
          'PROPOSAL_STATUS_VOTING_PERIOD': 'VOTING PERIOD',
          'proposal_passed': 'PASSED',
          'proposal_rejected': 'REJECTED',
          'proposal_failed': 'FAILED',
          'proposal_dropped': 'FAILED', // Map dropped to failed
        }
        const mappedStatus = statusMap[proposal.status] || proposal.status
        const status = proposalStatusList.find(
          (item) => item.status === mappedStatus
        )

        // Parse tally results from JSON string
        // Indexer format: {"tally":{"yes":"...","no":"...","abstain":"...","no_with_veto":"..."},"totalPower":"..."}
        // Also supports cosmos-style *_count keys. Vote counts are micro-denom; totalPower is already normalized.
        let voteResults: {
          hasVotes: boolean
          voteDistribution: {
            yes: { value: number; percentage: string }
            no: { value: number; percentage: string }
            abstain: { value: number; percentage: string }
            veto: { value: number; percentage: string }
          } | null
          totalPower: number
          totalStakedPower?: number
        } = {
          hasVotes: false,
          voteDistribution: null,
          totalPower: 0
        }

        try {
          if (proposal.tallyResults) {
            const tallyData = JSON.parse(proposal.tallyResults)
            const tally = tallyData.tally || {}
            
            // Support both indexer keys (yes) and cosmos keys (yes_count)
            const yesCount = Number(tally.yes_count || tally.yes || '0')
            const noCount = Number(tally.no_count || tally.no || '0')
            const abstainCount = Number(tally.abstain_count || tally.abstain || '0')
            const noWithVetoCount = Number(
              tally.no_with_veto_count || tally.no_with_veto || '0'
            )
            
            // Determine if vote counts are in micro-denomination or already normalized
            const sampleValue = yesCount || noCount || abstainCount || noWithVetoCount || 0
            const isMicroDenomination = sampleValue > 1_000_000
            
            // Normalize vote counts if needed
            const normalizeValue = (value: number) => isMicroDenomination ? value / 1_000_000 : value
            
            // Normalize all vote counts
            const yesNormalized = normalizeValue(yesCount)
            const noNormalized = normalizeValue(noCount)
            const abstainNormalized = normalizeValue(abstainCount)
            const vetoNormalized = normalizeValue(noWithVetoCount)
            
            // Sum of all votes cast (normalized) - numerator for % of total power
            const totalVotesCast = yesNormalized + noNormalized + abstainNormalized + vetoNormalized

            // totalPower from tally is the bonded power at vote time (already normalized)
            const totalPowerAtVote =
              tallyData.totalPower !== undefined && tallyData.totalPower !== null
                ? Number(tallyData.totalPower)
                : 0

            // Calculate percentages - individual vote percentages are % of votes cast
            const formatVote = (normalizedVote: number) => {
              const percentage = totalVotesCast > 0 ? (normalizedVote / totalVotesCast) * 100 : 0
              return {
                value: normalizedVote,
                percentage: percentage.toFixed(2),
              }
            }

            if (totalVotesCast > 0) {
              voteResults = {
                hasVotes: true,
                voteDistribution: {
                  yes: formatVote(yesNormalized),
                  no: formatVote(noNormalized),
                  abstain: formatVote(abstainNormalized),
                  veto: formatVote(vetoNormalized),
                },
                totalPower: totalVotesCast,
                totalStakedPower: totalPowerAtVote,
              }
            }
          }
        } catch (error) {
          console.warn('Failed to parse tally results for proposal', proposal.proposalId, error)
        }

        // % of Total Power = (votes cast / totalPower at vote time) * 100
        // Cap at 100% when vote sum exceeds totalPower due to rounding.
        let quorumMet = false
        let currentQuorumPercentage = '0%'
        const totalPowerAtVote = voteResults.totalStakedPower ?? 0
        const requiredQuorumStr = quorumRequiredRef.current

        if (voteResults.hasVotes && requiredQuorumStr && totalPowerAtVote > 0) {
          const requiredQuorum = parseFloat(requiredQuorumStr.replace('%', ''))
          const currentQuorum = Math.min(
            100,
            (voteResults.totalPower / totalPowerAtVote) * 100
          )
          currentQuorumPercentage = `${currentQuorum.toFixed(2)}%`
          quorumMet = currentQuorum >= requiredQuorum
        }

        return {
          id: proposal.proposalId,
          title: proposal.title || 'Untitled Proposal',
          types: type,
          status: status,
          votingEnd: votingEnd,
          voteResults: voteResults,
          quorum: {
            required: requiredQuorumStr,
            met: quorumMet,
            percentage: currentQuorumPercentage,
          },
        }
      })

      if (!mountedRef.current) return

      setProposals(proposalsList)
    } catch (error) {
      if (!mountedRef.current) return
      
      const errorMessage = getErrorMessage(error)
      setError(errorMessage)
      
      toast({
        title: 'Failed to fetch proposals',
        description: errorMessage,
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
  }, [page, perPage, fetchFirstPage, fetchNextPage])

  // 1) Load quorum threshold first (do not map proposals until ready).
  useEffect(() => {
    mountedRef.current = true
    setQuorumReady(false)
    setIsLoading(true)
    setError(null)

    const loadQuorum = async () => {
      await fetchQuorumRequirement()
      if (!mountedRef.current) return
      setQuorumReady(true)
    }
    void loadQuorum()

    return () => {
      mountedRef.current = false
      isFetchingRef.current = false
    }
  }, [fetchQuorumRequirement, rpcAddress])

  // 2) Fetch/map proposals only after quorum threshold is ready (also on page changes).
  useEffect(() => {
    if (!quorumReady || !mountedRef.current) return

    setIsLoading(true)
    void fetchProposals()
  }, [quorumReady, fetchProposals])

  // Reset pagination when RPC endpoint changes (quorum effect above also re-runs).
  useEffect(() => {
    if (!rpcAddress) return
    setPage(0)
    setPagesCursors([])
  }, [rpcAddress])

  const onChangePagination = useCallback(
    (value: { pageIndex: number; pageSize: number }) => {
      if (value.pageIndex !== page || value.pageSize !== perPage) {
        // If page size changed, reset to page 0 and clear cursors
        if (value.pageSize !== perPage) {
          setPage(0)
          setPerPage(value.pageSize)
          setPagesCursors([])
        } else {
          setPage(value.pageIndex)
          setPerPage(value.pageSize)
        }
      }
    },
    [page, perPage]
  )

  return (
    <>
      <Head>
        <title>Proposals | Tellor Explorer</title>
        <meta name="description" content="Proposals | Tellor Explorer" />
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
          border="1px solid" borderColor={useColorModeValue('border.light', 'border.dark')}
          borderRadius="2xl"
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
          {error ? (
            <VStack spacing={4} py={8}>
              <Text color="red.500" fontSize="lg" fontWeight="bold">
                Failed to load proposals
              </Text>
              <Text color="gray.600" textAlign="center" maxW="md">
                {error}
              </Text>
              <Text color="gray.500" fontSize="sm" textAlign="center">
                Please check your connection and try again.
              </Text>
            </VStack>
          ) : (
            <DataTable
              columns={columns}
              data={proposals}
              total={total}
              isLoading={isLoading}
              onChangePagination={onChangePagination}
            />
          )}
        </Box>
      </main>
    </>
  )
}
