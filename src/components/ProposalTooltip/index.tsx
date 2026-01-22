import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Divider,
  Spinner,
  useColorModeValue,
  Portal,
} from '@chakra-ui/react'
import { FiCopy } from 'react-icons/fi'
import { useClipboard } from '@chakra-ui/react'
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_GOV_PROPOSAL_BY_ID } from '@/datasources/graphql/queries'
import { GovProposalResponse } from '@/datasources/graphql/types'
import { getTypeMsg } from '@/utils/helper'

interface ProposalDetails {
  proposalId: number
  title: string
  summary: string
  metadata: string
  proposer: string
  expedited: boolean
  failedReason: string
  messages: Array<{
    index: number
    type: string
    content: any
  }>
  messageTypes: string[]
  primaryType: string
  status: string | number
  submitTime: string | null
  depositEndTime: string | null
  votingStartTime: string | null
  votingEndTime: string | null
  totalDeposit: any[]
  tallyResult: {
    yes: string
    no: string
    abstain: string
    noWithVeto: string
  } | null
}

interface ProposalTooltipProps {
  proposalId: number
  children: React.ReactNode
}

const ProposalTooltip: React.FC<ProposalTooltipProps> = ({
  proposalId,
  children,
}) => {
  const [proposalDetails, setProposalDetails] =
    useState<ProposalDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { hasCopied, onCopy } = useClipboard(proposalDetails?.summary || '')

  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const textColor = useColorModeValue('gray.800', 'white')
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.300')

  // Position tooltip to the right of the trigger element, centered vertically
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const tooltipHeight = 700 // maxH from tooltip content
      const tooltipWidth = 700 // maxW from tooltip content

      // Calculate horizontal position (to the right with some padding)
      let x = rect.right + 10

      // Calculate vertical position (centered on trigger element)
      let y = rect.top + rect.height / 2 - tooltipHeight / 2

      // Ensure tooltip stays within viewport
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Adjust horizontal position if tooltip would go off-screen
      if (x + tooltipWidth > viewportWidth) {
        x = rect.left - tooltipWidth - 10 // Show to the left instead
      }

      // Adjust vertical position if tooltip would go off-screen
      if (y < 10) {
        y = 10 // Minimum top margin
      } else if (y + tooltipHeight > viewportHeight - 10) {
        // If tooltip would go off bottom, try to position it above the trigger
        const spaceAbove = rect.top - 10
        const spaceBelow = viewportHeight - rect.bottom - 10

        if (spaceAbove >= tooltipHeight) {
          // Position above the trigger element
          y = rect.top - tooltipHeight - 10
        } else if (spaceBelow >= tooltipHeight) {
          // Position below the trigger element
          y = rect.bottom + 10
        } else {
          // Not enough space above or below, center in available space
          y = Math.max(10, Math.min(y, viewportHeight - tooltipHeight - 10))
        }
      }

      setPosition({ x, y })
    }
  }, [])

  // Fetch proposal details using GraphQL
  const fetchProposalDetails = useCallback(async () => {
    if (proposalDetails || isLoading) return

    console.log('Fetching proposal details for ID:', proposalId)
    setIsLoading(true)
    setError(null)

    try {
      const response = await graphqlQuery<GovProposalResponse>(
        GET_GOV_PROPOSAL_BY_ID,
        { proposalId: String(proposalId) }
      )

      if (!response?.govProposal) {
        throw new Error('Proposal not found')
      }

      const proposal = response.govProposal

      // Parse messages field (comma-separated string) into array
      let messageTypes: string[] = []
      let formattedMessages: Array<{
        index: number
        type: string
        content: any
      }> = []
      let primaryType = 'Unknown Type'

      try {
        if (proposal.messages && proposal.messages.trim()) {
          // Messages field is a comma-separated string of message type URLs
          messageTypes = proposal.messages
            .split(',')
            .map((msg: string) => msg.trim())
            .filter((msg: string) => msg.length > 0)

          if (messageTypes.length > 0) {
            primaryType = getTypeMsg(messageTypes[0]) || messageTypes[0]

            // Format messages for display
            formattedMessages = messageTypes.map((messageType, index) => ({
              index: index + 1,
              type: messageType,
              content: { '@type': messageType }, // GraphQL doesn't provide full message content
            }))
          }
        }
      } catch (error) {
        console.warn('Failed to parse proposal messages:', error)
      }

      // Parse tally results if available
      let tallyResult = null
      try {
        if (proposal.tallyResults) {
          const tallyData = JSON.parse(proposal.tallyResults)
          const tally = tallyData.tally || {}
          tallyResult = {
            yes: tally.yes_count || tally.yes || '0',
            no: tally.no_count || tally.no || '0',
            abstain: tally.abstain_count || tally.abstain || '0',
            noWithVeto: tally.no_with_veto_count || tally.no_with_veto || '0',
          }
        }
      } catch (error) {
        console.warn('Failed to parse tally results:', error)
      }

      // Map GraphQL status to expected format
      const statusMap: Record<string, string> = {
        'proposal_deposit_period': 'PROPOSAL_STATUS_DEPOSIT_PERIOD',
        'proposal_voting_period': 'PROPOSAL_STATUS_VOTING_PERIOD',
        'PROPOSAL_STATUS_VOTING_PERIOD': 'PROPOSAL_STATUS_VOTING_PERIOD',
        'proposal_passed': 'PROPOSAL_STATUS_PASSED',
        'proposal_rejected': 'PROPOSAL_STATUS_REJECTED',
        'proposal_failed': 'PROPOSAL_STATUS_FAILED',
        'proposal_dropped': 'PROPOSAL_STATUS_FAILED',
      }
      const mappedStatus = statusMap[proposal.status] || proposal.status

      // Transform GraphQL response to ProposalDetails format
      const details: ProposalDetails = {
        proposalId: proposal.proposalId,
        title: proposal.title || 'Untitled Proposal',
        summary: proposal.summary || '',
        metadata: proposal.metaData || '',
        proposer: proposal.proposer || '',
        expedited: proposal.expedited || false,
        failedReason: '', // GraphQL doesn't provide this field
        messages: formattedMessages,
        messageTypes,
        primaryType,
        status: mappedStatus,
        submitTime: proposal.submitTime || null,
        depositEndTime: proposal.depositEndTime || null,
        votingStartTime: proposal.votingStartTime || null,
        votingEndTime: proposal.votingEndTime || null,
        totalDeposit: [], // GraphQL doesn't provide this field
        tallyResult,
      }

      console.log('Proposal data received:', details)
      setProposalDetails(details)
    } catch (err) {
      console.error('Error fetching proposal details:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch proposal details'
      )
    } finally {
      setIsLoading(false)
    }
  }, [proposalId, proposalDetails, isLoading])

  // Handle mouse enter on trigger
  const handleMouseEnter = useCallback(() => {
    updatePosition()
    setIsOpen(true)
    if (!proposalDetails && !isLoading) {
      fetchProposalDetails()
    }
  }, [proposalDetails, isLoading, updatePosition, fetchProposalDetails])

  // Handle mouse leave with delay
  const handleMouseLeave = useCallback(() => {
    setTimeout(() => {
      if (!tooltipRef.current?.matches(':hover')) {
        setIsOpen(false)
      }
    }, 100)
  }, [])

  // Handle mouse enter on tooltip
  const handleTooltipMouseEnter = useCallback(() => {
    setIsOpen(true)
  }, [])

  // Handle mouse leave on tooltip
  const handleTooltipMouseLeave = useCallback(() => {
    setTimeout(() => {
      if (!triggerRef.current?.matches(':hover')) {
        setIsOpen(false)
      }
    }, 100)
  }, [])

  // Update position on window resize
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        updatePosition()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen, updatePosition])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const formatVoteValue = (value: string) => {
    const numValue = Number(value) / 1_000_000
    return numValue.toLocaleString(undefined, { maximumFractionDigits: 6 })
  }

  const getStatusColor = (status: string | number) => {
    const statusStr = typeof status === 'string' ? status : status.toString()
    const statusMap: { [key: string]: string } = {
      PROPOSAL_STATUS_UNSPECIFIED: 'gray',
      PROPOSAL_STATUS_DEPOSIT_PERIOD: 'blue',
      PROPOSAL_STATUS_VOTING_PERIOD: 'yellow',
      PROPOSAL_STATUS_PASSED: 'green',
      PROPOSAL_STATUS_REJECTED: 'red',
      PROPOSAL_STATUS_FAILED: 'red',
      '0': 'gray',
      '1': 'blue',
      '2': 'yellow',
      '3': 'green',
      '4': 'red',
      '5': 'red',
    }
    return statusMap[statusStr] || 'gray'
  }

  const getTypeDisplayName = (type: string) => {
    const typeMap: { [key: string]: string } = {
      '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade': 'Software Upgrade',
      '/cosmos.gov.v1beta1.TextProposal': 'Text Proposal',
      '/cosmos.params.v1beta1.ParameterChangeProposal': 'Parameter Change',
      '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal':
        'Community Pool Spend',
      '/cosmos.gov.v1.MsgUpdateParams': 'Governance Parameters Update',
      '/layer.oracle.MsgUpdateParams': 'Oracle Parameters Update',
      '/layer.registry.MsgUpdateParams': 'Registry Parameters Update',
      '/layer.dispute.MsgUpdateParams': 'Dispute Parameters Update',
      '/layer.reporter.MsgUpdateParams': 'Reporter Parameters Update',
    }
    return typeMap[type] || type.split('.').pop() || 'Unknown Type'
  }

  const getStatusText = (status: string | number) => {
    const statusStr = typeof status === 'string' ? status : status.toString()
    const statusMap: { [key: string]: string } = {
      PROPOSAL_STATUS_UNSPECIFIED: 'Unspecified',
      PROPOSAL_STATUS_DEPOSIT_PERIOD: 'Deposit Period',
      PROPOSAL_STATUS_VOTING_PERIOD: 'Voting Period',
      PROPOSAL_STATUS_PASSED: 'Passed',
      PROPOSAL_STATUS_REJECTED: 'Rejected',
      PROPOSAL_STATUS_FAILED: 'Failed',
      '0': 'Unspecified',
      '1': 'Deposit Period',
      '2': 'Voting Period',
      '3': 'Passed',
      '4': 'Rejected',
      '5': 'Failed',
    }
    return statusMap[statusStr] || 'Unknown'
  }

  const tooltipContent = (
    <Box
      maxW="700px"
      maxH="700px"
      p={4}
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      shadow="lg"
      overflowY="auto"
    >
      {isLoading && (
        <HStack justify="center" py={4}>
          <Spinner size="sm" />
          <Text fontSize="sm">Loading proposal details...</Text>
        </HStack>
      )}

      {error && (
        <Text color="red.500" fontSize="sm">
          Error: {error}
        </Text>
      )}

      {proposalDetails && (
        <VStack align="start" spacing={3}>
          {/* Header */}
          <HStack justify="space-between" w="full">
            <Text fontWeight="bold" fontSize="sm" color={textColor}>
              Proposal #{proposalDetails.proposalId}
            </Text>
            <HStack spacing={2}>
              <Badge colorScheme={getStatusColor(proposalDetails.status)}>
                {getStatusText(proposalDetails.status)}
              </Badge>
              {proposalDetails.expedited && (
                <Badge colorScheme="orange" size="sm">
                  Expedited
                </Badge>
              )}
            </HStack>
          </HStack>

          {/* Title and Type */}
          <Box w="full">
            <Text fontWeight="semibold" fontSize="sm" mb={1} color={textColor}>
              {proposalDetails.title}
            </Text>
            <Text fontSize="xs" color={secondaryTextColor}>
              Type: {getTypeDisplayName(proposalDetails.primaryType)}
            </Text>
          </Box>

          {/* Summary */}
          {proposalDetails.summary && (
            <Box w="full">
              <HStack justify="space-between" mb={1}>
                <Text fontWeight="semibold" fontSize="xs" color={textColor}>
                  Summary:
                </Text>
                <Box
                  cursor="pointer"
                  onClick={onCopy}
                  title={hasCopied ? 'Copied!' : 'Copy summary'}
                >
                  <FiCopy size={12} color={textColor} />
                </Box>
              </HStack>
              <Text
                fontSize="xs"
                bg={useColorModeValue('gray.50', 'gray.700')}
                p={2}
                borderRadius="sm"
                color={textColor}
                wordBreak="break-word"
              >
                {proposalDetails.summary}
              </Text>
            </Box>
          )}

          {/* Two-column layout for main content */}
          <HStack align="start" spacing={4} w="full">
            {/* Left Column - Messages (much larger) */}
            <Box flex="2" minW="0">
              {proposalDetails.messages &&
                proposalDetails.messages.length > 0 && (
                  <Box w="full">
                    <Text
                      fontWeight="semibold"
                      fontSize="xs"
                      mb={2}
                      color={textColor}
                    >
                      Messages ({proposalDetails.messages.length}):
                    </Text>
                    <VStack
                      align="start"
                      spacing={2}
                      maxH="400px"
                      overflowY="auto"
                      css={{
                        '&::-webkit-scrollbar': {
                          width: '6px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: useColorModeValue('#f1f1f1', '#2d3748'),
                          borderRadius: '3px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: useColorModeValue('#c1c1c1', '#4a5568'),
                          borderRadius: '3px',
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                          background: useColorModeValue('#a8a8a8', '#718096'),
                        },
                      }}
                    >
                      {proposalDetails.messages.map((message) => (
                        <Box
                          key={message.index}
                          w="full"
                          p={3}
                          bg={useColorModeValue('gray.50', 'gray.700')}
                          borderRadius="sm"
                        >
                          <Text
                            fontSize="xs"
                            fontWeight="semibold"
                            color={textColor}
                            mb={2}
                          >
                            {message.index}. {getTypeDisplayName(message.type)}
                          </Text>
                          <Text
                            fontSize="xs"
                            color={secondaryTextColor}
                            wordBreak="break-word"
                            maxH="200px"
                            overflowY="auto"
                            whiteSpace="pre-wrap"
                            css={{
                              '&::-webkit-scrollbar': {
                                width: '4px',
                              },
                              '&::-webkit-scrollbar-track': {
                                background: useColorModeValue(
                                  '#f1f1f1',
                                  '#2d3748'
                                ),
                                borderRadius: '2px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                background: useColorModeValue(
                                  '#c1c1c1',
                                  '#4a5568'
                                ),
                                borderRadius: '2px',
                              },
                              '&::-webkit-scrollbar-thumb:hover': {
                                background: useColorModeValue(
                                  '#a8a8a8',
                                  '#718096'
                                ),
                              },
                            }}
                          >
                            {JSON.stringify(message.content, null, 2)}
                          </Text>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}
            </Box>

            {/* Right Column - Timeline (smaller) */}
            <Box flex="1" minW="0">
              <Text
                fontWeight="semibold"
                fontSize="xs"
                mb={2}
                color={textColor}
              >
                Timeline:
              </Text>
              <VStack align="start" spacing={1}>
                <Text fontSize="xs" color={secondaryTextColor}>
                  <strong>Submitted:</strong>{' '}
                  {formatDate(proposalDetails.submitTime)}
                </Text>
                <Text fontSize="xs" color={secondaryTextColor}>
                  <strong>Deposit End:</strong>{' '}
                  {formatDate(proposalDetails.depositEndTime)}
                </Text>
                <Text fontSize="xs" color={secondaryTextColor}>
                  <strong>Voting Start:</strong>{' '}
                  {formatDate(proposalDetails.votingStartTime)}
                </Text>
                <Text fontSize="xs" color={secondaryTextColor}>
                  <strong>Voting End:</strong>{' '}
                  {formatDate(proposalDetails.votingEndTime)}
                </Text>
              </VStack>
            </Box>
          </HStack>

          {/* Footer - Proposer and Metadata */}
          <Box w="full" pt={2} borderTop="1px solid" borderColor={borderColor}>
            {proposalDetails.proposer && (
              <Text
                fontSize="xs"
                color={secondaryTextColor}
                mb={1}
                wordBreak="break-all"
              >
                <strong>Proposer:</strong> {proposalDetails.proposer}
              </Text>
            )}
            {proposalDetails.metadata && (
              <Text
                fontSize="xs"
                color={secondaryTextColor}
                wordBreak="break-all"
              >
                <strong>Metadata:</strong> {proposalDetails.metadata}
              </Text>
            )}
          </Box>

          {proposalDetails.failedReason && (
            <Text fontSize="xs" color="red.500">
              <strong>Failed Reason:</strong> {proposalDetails.failedReason}
            </Text>
          )}
        </VStack>
      )}
    </Box>
  )

  return (
    <>
      <Box
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        display="inline-block"
      >
        {children}
      </Box>

      {isOpen && (
        <Portal>
          <Box
            ref={tooltipRef}
            position="fixed"
            left={`${position.x}px`}
            top={`${position.y}px`}
            zIndex={9999}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            {tooltipContent}
          </Box>
        </Portal>
      )}
    </>
  )
}

export default ProposalTooltip
