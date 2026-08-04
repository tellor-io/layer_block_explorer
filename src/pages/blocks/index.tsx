/**
 * HYBRID DATA ARCHITECTURE - Blocks List Page
 * 
 * This page uses GraphQL for block data fetching:
 * 
 * GraphQL Data Sources (via /src/datasources/graphql/):
 * - Latest blocks list (GET_LATEST_BLOCKS)
 * - Block details and metadata
 * - Proposer information
 * - Transaction counts
 * 
 * Migration Notes:
 * - Replaced RPC websocket subscriptions with GraphQL polling
 * - Maintained real-time updates via useEffect polling
 * - Preserved all existing UI/UX functionality
 * - All RPC code preserved in comments for reference
 */

import { useEffect, useState, useMemo, useRef } from 'react'
import {
  Box,
  Divider,
  HStack,
  Heading,
  Icon,
  Link,
  Table,
  useColorModeValue,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Tag,
  TagLeftIcon,
  TagLabel,
  Tooltip,
  useClipboard,
  Alert,
  AlertIcon,
  AlertDescription,
  Select,
  IconButton,
  Flex,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { FiChevronRight, FiHome, FiCheck, FiX, FiCopy, FiChevronLeft } from 'react-icons/fi'
import { ChevronLeftIcon, ChevronRightIcon, ArrowLeftIcon, ArrowRightIcon } from '@chakra-ui/icons'
import { toHex } from '@cosmjs/encoding'
import { TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { timeFromNow, trimHash, getTypeMsg, bytesToBech32ConsensusAddress } from '@/utils/helper'
import { sha256 } from '@cosmjs/crypto'
import { CopyableHash } from '@/components/CopyableHash'
import Head from 'next/head'
// GraphQL imports
import { graphqlQuery, bytesToHex, parseJsonField } from '@/datasources/graphql/client'
import { GET_LATEST_BLOCKS, GET_VALIDATORS } from '@/datasources/graphql/queries'
import { BlocksResponse, Block, ValidatorsResponse, Validator, ValidatorDescription, PageInfo } from '@/datasources/graphql/types'


// GraphQL interfaces
interface GraphQLBlock {
  blockHeight: string
  blockHash: string
  blockTime: string
  proposerAddress: string
  numberOfTx: number
  appHash: string
}

interface ValidatorMap {
  [key: string]: string
}

export default function Blocks() {
  // Cursor-based pagination state
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [pagesCursors, setPagesCursors] = useState<Array<{ startCursor: string | null; endCursor: string | null }>>([])
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [visibleBlocks, setVisibleBlocks] = useState<Block[]>([])
  const [validatorMap, setValidatorMap] = useState<ValidatorMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const isPollingInProgressRef = useRef(false) // Track if a poll request is in flight
  const lastSeenBlockHeightRef = useRef<number | null>(null) // Track the highest block height we've seen
  const lastPollTimeRef = useRef<number | null>(null) // Track when the last poll started
  
  // Derived state
  const isPolling = pageIndex === 0

  const iconColor = useColorModeValue('light-theme', 'dark-theme')
  const containerBg = useColorModeValue('light-container', 'dark-container')
  const tabBg = useColorModeValue('light-theme', 'dark-theme')
  const tabTextColor = useColorModeValue('gray.600', 'gray.200')
  const tabHoverColor = useColorModeValue('black', 'black')
  const linkColor = useColorModeValue('light-theme', 'emerald.300')
  const txLinkColor = useColorModeValue('light-theme', 'dark-theme')
  const selectedTextColor = useColorModeValue('pine.50', 'pine.950')
  const selectedBgColor = useColorModeValue('pine.950', 'emerald.500')
  const heightLinkColor = useColorModeValue('light-theme', 'emerald.300')
  const txHashColor = useColorModeValue('light-theme', 'dark-theme')

  const tabStyles = useMemo(
    () => ({
      selected: {
        color: selectedTextColor,
        bg: selectedBgColor,
      },
      hover: {
        bg: 'button-hover',
        color: tabHoverColor,
      },
      normal: {
        color: tabTextColor,
        borderRadius: 5,
      },
    }),
    [selectedTextColor, selectedBgColor, tabHoverColor, tabTextColor]
  )


  // GraphQL fetch validators (client-side as per migration plan)
  const fetchValidators = async () => {
    try {
      console.log('Blocks page: Fetching validators from GraphQL')
      const response = await graphqlQuery<ValidatorsResponse>(GET_VALIDATORS, { first: 200 })
      
      if (response?.validators?.edges) {
        const map: { [key: string]: string } = {}
        response.validators.edges.forEach(({ node: validator }) => {
          // Use consensusAddress field directly for matching
          if (validator.consensusAddress) {
            // Description is already parsed as an object, not a JSON string
            const description = typeof validator.description === 'string' 
              ? parseJsonField(validator.description) as ValidatorDescription | null
              : validator.description as ValidatorDescription | null
            map[validator.consensusAddress] = description?.moniker || 'Unknown'
            console.log('Validator mapping:', { 
              consensusAddress: validator.consensusAddress, 
              moniker: description?.moniker || 'Unknown' 
            })
          }
        })
        setValidatorMap(map)
        console.log(
          'Blocks page: Successfully fetched validators from GraphQL, map size:',
          Object.keys(map).length
        )
      }
    } catch (error) {
      console.error('Error fetching validators from GraphQL:', error)
    }
  }

  // Fetch first page (page 1)
  const fetchFirstPage = async (size: number) => {
    try {
      setError(null)
      const response = await graphqlQuery<BlocksResponse>(GET_LATEST_BLOCKS, {
        first: size
      })
      
      if (response?.blocks?.edges) {
        const blocksData = response.blocks.edges.map(({ node: block }) => block)
        setVisibleBlocks(blocksData)
        setPageInfo(response.blocks.pageInfo)
        
        // Store cursors for page 0
        const cursors = {
          startCursor: response.blocks.pageInfo.startCursor,
          endCursor: response.blocks.pageInfo.endCursor,
        }
        setPagesCursors([cursors])
      }
    } catch (error) {
      console.error('Error fetching first page:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch blocks'
      setError(errorMessage)
      throw error
    }
  }

  // Fetch next page
  const fetchNextPage = async (afterCursor: string | null, size: number) => {
    if (!afterCursor) {
      throw new Error('No cursor available for next page')
    }
    
    try {
      setError(null)
      const response = await graphqlQuery<BlocksResponse>(GET_LATEST_BLOCKS, {
        first: size,
        after: afterCursor
      })
      
      if (response?.blocks?.edges) {
        const blocksData = response.blocks.edges.map(({ node: block }) => block)
        setVisibleBlocks(blocksData)
        setPageInfo(response.blocks.pageInfo)
        
        // Store cursors for the new page
        const cursors = {
          startCursor: response.blocks.pageInfo.startCursor,
          endCursor: response.blocks.pageInfo.endCursor,
        }
        setPagesCursors((prev) => [...prev, cursors])
      }
    } catch (error) {
      console.error('Error fetching next page:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch next page'
      setError(errorMessage)
      throw error
    }
  }

  // Fetch previous page
  const fetchPrevPage = async (beforeCursor: string | null, size: number) => {
    if (!beforeCursor) {
      throw new Error('No cursor available for previous page')
    }
    
    try {
      setError(null)
      const response = await graphqlQuery<BlocksResponse>(GET_LATEST_BLOCKS, {
        last: size,
        before: beforeCursor
      })
      
      if (response?.blocks?.edges) {
        const blocksData = response.blocks.edges.map(({ node: block }) => block)
        setVisibleBlocks(blocksData)
        setPageInfo(response.blocks.pageInfo)
        
        // Note: We don't need to modify pagesCursors when going back
        // as we're using the stored cursor from the previous page
      }
    } catch (error) {
      console.error('Error fetching previous page:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch previous page'
      setError(errorMessage)
      throw error
    }
  }


  // Track if initial load has happened to avoid refetching on pageSize changes
  const initialLoadRef = useRef(false)

  // Initial data fetching - fetch validators and first page (runs once on mount)
  useEffect(() => {
    if (initialLoadRef.current) return
    initialLoadRef.current = true

    async function fetchData() {
      try {
        console.log('Blocks page: Fetching data from GraphQL')
        
        setIsLoading(true)
        setError(null)

        // Fetch validators (for proposer monikers) and first page in parallel
        await Promise.all([fetchValidators(), fetchFirstPage(pageSize)])
        setPageIndex(0)
        
        // Initialize last seen block height after first load
        setVisibleBlocks((current) => {
          if (current.length > 0) {
            const topHeight = parseInt(current[0].blockHeight, 10)
            lastSeenBlockHeightRef.current = topHeight
          }
          return current
        })
        
        console.log('Blocks page: Successfully fetched first page')
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching blocks data from GraphQL:', error)
        setIsLoading(false)
      }
    }
    
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionally only run once on mount

  // Polling effect - only runs on page 1 (pageIndex === 0)
  useEffect(() => {
    // Stop polling if not on page 1
    if (pageIndex !== 0) {
      if (pollingInterval) {
        clearTimeout(pollingInterval as unknown as NodeJS.Timeout)
        setPollingInterval(null)
      }
      // Reset the polling flag when stopping
      isPollingInProgressRef.current = false
      lastPollTimeRef.current = null
      console.log(`[Blocks Poll] Polling stopped (not on page 1)`)
      return
    }

    // Use a ref to track if polling should continue
    let isPollingActive = true
    let currentTimeoutId: NodeJS.Timeout | null = null
    const POLL_INTERVAL_MS = 1000

    // Recursive polling function that ensures consistent 1-second intervals between poll starts
    const scheduleNextPoll = (delay: number = POLL_INTERVAL_MS) => {
      if (!isPollingActive || pageIndex !== 0) {
        return
      }

      // Clear any existing timeout
      if (currentTimeoutId) {
        clearTimeout(currentTimeoutId)
      }

      currentTimeoutId = setTimeout(async () => {
        if (!isPollingActive || pageIndex !== 0) {
          return
        }

        const pollStartTime = Date.now()
        const timeSinceLastPoll = lastPollTimeRef.current ? pollStartTime - lastPollTimeRef.current : null
        lastPollTimeRef.current = pollStartTime
        
        const pollTimestamp = new Date(pollStartTime).toISOString()
        console.log(`[Blocks Poll] ${pollTimestamp} - STARTING poll. Time since last poll: ${timeSinceLastPoll ? `${timeSinceLastPoll}ms` : 'N/A'}`)
        
        try {
          isPollingInProgressRef.current = true
          const queryStartTime = Date.now()
          
          // Fetch latest blocks for page 1
          const response = await graphqlQuery<BlocksResponse>(GET_LATEST_BLOCKS, {
            first: pageSize
          })
          
          const queryDuration = Date.now() - queryStartTime
          const queryCompleteTime = new Date(Date.now()).toISOString()
          console.log(`[Blocks Poll] ${queryCompleteTime} - Query completed in ${queryDuration}ms`)
          
          if (response?.blocks?.edges) {
            const incomingBlocks = response.blocks.edges.map(({ node: block }) => block)
            
            // Get the top block height from incoming blocks
            const incomingTopHeight = incomingBlocks.length > 0 ? parseInt(incomingBlocks[0].blockHeight, 10) : null
            const lastSeenHeight = lastSeenBlockHeightRef.current
            
            console.log(`[Blocks Poll] Response received - Top block height: ${incomingTopHeight}, Last seen: ${lastSeenHeight}, Incoming blocks count: ${incomingBlocks.length}`)
            
            // Compare with current blocks to find new ones or refresh if needed
            setVisibleBlocks((prev) => {
              // Get the highest block height from current list (convert to number for comparison)
              const currentTopHeight = prev.length > 0 ? parseInt(prev[0].blockHeight, 10) : null
              
              // If no existing blocks, initialize
              if (!currentTopHeight || prev.length === 0) {
                return incomingBlocks
              }
              
              // Initialize lastSeenHeight if it's null (first poll after mount)
              if (lastSeenHeight === null && incomingTopHeight !== null) {
                // Initialize from current blocks
                return prev
              }
              
              // Filter incoming blocks to only include ones we haven't seen yet
              // Collect ALL new blocks that are higher than lastSeenHeight
              // The indexer may batch updates, so we need to capture all new blocks
              const prevHeights = new Set(prev.map(b => b.blockHeight))
              const newBlocks: Block[] = []
              let highestNewBlockHeight: number | null = null
              
              for (const block of incomingBlocks) {
                const blockHeightNum = parseInt(block.blockHeight, 10)
                
                // Only include blocks that are:
                // 1. Not already in our current list, AND
                // 2. Higher than the last block we've seen (if we have a last seen height)
                if (!prevHeights.has(block.blockHeight)) {
                  if (lastSeenHeight === null || blockHeightNum > lastSeenHeight) {
                    newBlocks.push(block)
                    // Track the highest new block we found
                    if (highestNewBlockHeight === null || blockHeightNum > highestNewBlockHeight) {
                      highestNewBlockHeight = blockHeightNum
                    }
                  }
                } else {
                  // Once we hit an existing block, stop (blocks are ordered by height desc)
                  break
                }
              }
              
              // If there are new blocks, add them all and trim to pageSize
              if (newBlocks.length > 0) {
                const updateTime = new Date(Date.now()).toISOString()
                // Log when multiple blocks appear at once for debugging
                if (newBlocks.length > 1) {
                  console.log(`[Blocks Poll] ${updateTime} - ⚠️ Multiple blocks detected: ${newBlocks.length} new blocks. Last seen: ${lastSeenHeight}, Incoming top: ${incomingTopHeight}, New blocks: ${newBlocks.map(b => b.blockHeight).join(', ')}`)
                } else {
                  console.log(`[Blocks Poll] ${updateTime} - ✅ Found ${newBlocks.length} new block(s): ${newBlocks.map(b => b.blockHeight).join(', ')}`)
                }
                
                // Update lastSeenHeight to the highest new block we're adding
                if (highestNewBlockHeight !== null) {
                  lastSeenBlockHeightRef.current = highestNewBlockHeight
                }
                
                const combined = [...newBlocks, ...prev]
                // Trim to pageSize, keeping only the newest blocks
                return combined.slice(0, pageSize)
              }
              
              // Log when no new blocks found
              const noNewBlocksTime = new Date(Date.now()).toISOString()
              console.log(`[Blocks Poll] ${noNewBlocksTime} - No new blocks (top block unchanged: ${currentTopHeight})`)
              
              // If the top block changed but we didn't find new blocks in our filter,
              // it means the indexer might have caught up with multiple blocks at once,
              // or our lastSeenHeight tracking got out of sync. Replace the list.
              if (incomingTopHeight && incomingTopHeight !== currentTopHeight) {
                // Update lastSeenHeight when we replace the list
                if (incomingTopHeight > (lastSeenBlockHeightRef.current || 0)) {
                  lastSeenBlockHeightRef.current = incomingTopHeight
                }
                return incomingBlocks
              }
              
              // No new blocks and top block is the same, keep existing list
              return prev
            })
            
            // Update pageInfo and cursors for page 0
            setPageInfo(response.blocks.pageInfo)
            const cursors = {
              startCursor: response.blocks.pageInfo.startCursor,
              endCursor: response.blocks.pageInfo.endCursor,
            }
            setPagesCursors((prev) => {
              const updated = [...prev]
              if (updated.length === 0) {
                updated[0] = cursors
              } else {
                updated[0] = cursors
              }
              return updated
            })
          }
        } catch (error) {
          const errorTime = new Date(Date.now()).toISOString()
          const totalPollDuration = Date.now() - pollStartTime
          console.error(`[Blocks Poll] ${errorTime} - ❌ ERROR after ${totalPollDuration}ms:`, error)
          // Set error but don't stop polling - will retry on next tick
          const errorMessage = error instanceof Error ? error.message : 'Error polling blocks'
          setError(errorMessage)
        } finally {
          // Always clear the flag when request completes (success or error)
          isPollingInProgressRef.current = false
          const pollEndTime = Date.now()
          const totalPollDuration = pollEndTime - pollStartTime
          const pollEndTimestamp = new Date(pollEndTime).toISOString()
          
          // Calculate delay for next poll to maintain consistent 1-second intervals
          // If request took longer than 1 second, schedule immediately (no delay)
          // Otherwise, wait the remaining time to maintain 1-second intervals between poll starts
          const delay = Math.max(0, POLL_INTERVAL_MS - totalPollDuration)
          console.log(`[Blocks Poll] ${pollEndTimestamp} - Poll completed (total duration: ${totalPollDuration}ms, next poll in: ${delay}ms)`)
          
          // Schedule next poll with calculated delay to ensure consistent 1-second intervals between poll starts
          scheduleNextPoll(delay)
        }
      }, delay)
      
      setPollingInterval(currentTimeoutId as unknown as NodeJS.Timeout)
    }

    // Start polling immediately on first run
    console.log(`[Blocks Poll] Starting polling (1000ms interval)`)
    scheduleNextPoll()

    return () => {
      isPollingActive = false
      // Clear the local timeout
      if (currentTimeoutId) {
        clearTimeout(currentTimeoutId)
        currentTimeoutId = null
      }
      // Also clear the state timeout if it exists
      if (pollingInterval) {
        clearTimeout(pollingInterval as unknown as NodeJS.Timeout)
      }
      // Reset the polling flag on cleanup
      isPollingInProgressRef.current = false
      lastPollTimeRef.current = null
      console.log(`[Blocks Poll] Polling cleanup - interval cleared`)
    }
  }, [pageIndex, pageSize]) // Removed visibleBlocks from dependencies to avoid restarting interval

  // Handle page size changes - refetch when pageSize changes (only if on page 1 or explicitly changed)
  // This effect is triggered by handlePageSizeChange function, so we don't need it here
  // We'll handle it in the handler function itself

  // Page navigation handlers
  const handleFirstPage = async () => {
    try {
      setIsLoading(true)
      setPageIndex(0)
      // Clear existing cursors to force fresh fetch
      setPagesCursors([])
      // Fetch fresh first page data - this ensures we get the latest N blocks
      await fetchFirstPage(pageSize)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching first page:', error)
      setIsLoading(false)
    }
  }

  const handlePreviousPage = async () => {
    if (pageIndex === 0) return
    
    try {
      setIsLoading(true)
      const prevPageIndex = pageIndex - 1
      
      // If going back to page 1 (index 0), fetch the latest N blocks
      // instead of using backward pagination to ensure we always show N blocks
      if (prevPageIndex === 0) {
        await handleFirstPage()
      } else {
        // For pages other than page 1, use backward pagination
        const prevPageCursors = pagesCursors[prevPageIndex]
        
        if (prevPageCursors?.startCursor) {
          await fetchPrevPage(prevPageCursors.startCursor, pageSize)
          setPageIndex(prevPageIndex)
        }
      }
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching previous page:', error)
      setIsLoading(false)
    }
  }

  const handleNextPage = async () => {
    if (!pageInfo?.hasNextPage) return
    
    try {
      setIsLoading(true)
      const currentPageCursors = pagesCursors[pageIndex]
      
      if (currentPageCursors?.endCursor) {
        await fetchNextPage(currentPageCursors.endCursor, pageSize)
        setPageIndex(pageIndex + 1)
      } else if (pageInfo.endCursor) {
        // Fallback to pageInfo cursor
        await fetchNextPage(pageInfo.endCursor, pageSize)
        setPageIndex(pageIndex + 1)
      }
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching next page:', error)
      setIsLoading(false)
    }
  }

  const handlePageSizeChange = async (newSize: number) => {
    try {
      setIsLoading(true)
      setError(null)
      setPageSize(newSize)
      setPageIndex(0)
      setPagesCursors([])
      await fetchFirstPage(newSize)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching blocks after page size change:', error)
      setIsLoading(false)
    }
  }



  const getProposerMoniker = (proposerAddress: string) => {
    try {
      // Convert comma-separated byte string to bech32 consensus address
      const consensusAddress = bytesToBech32ConsensusAddress(proposerAddress)
      const moniker = validatorMap[consensusAddress] || 'Unknown'
      return moniker
    } catch (error) {
      console.error('Error converting proposer address:', error)
      return 'Unknown'
    }
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
          <Heading size={'md'}>Blocks</Heading>
          <Divider borderColor={'gray'} size="10px" orientation="vertical" />
          <Link
            as={NextLink}
            href={'/'}
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}
            display="flex"
            justifyContent="center"
          >
            <Icon fontSize="16" color={iconColor} as={FiHome} />
          </Link>
          <Icon fontSize="16" as={FiChevronRight} />
          <Text>Blocks</Text>
        </HStack>
        <Box mt={8} bg={containerBg} border="1px solid" borderColor={useColorModeValue('border.light', 'border.dark')} borderRadius="2xl" p={4}>
          <Tabs variant="unstyled">
            <TabList>
              <Tab
                _selected={tabStyles.selected}
                _hover={tabStyles.hover}
                {...tabStyles.normal}
              >
                Blocks
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                {error && (
                  <Alert status="error" mb={4} borderRadius="md">
                    <AlertIcon />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Height</Th>
                        <Th>App Hash</Th>
                        <Th>Proposer</Th>
                        <Th>Txs</Th>
                        <Th>Time</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {isLoading && visibleBlocks.length === 0 ? (
                        <Tr>
                          <Td colSpan={5} textAlign="center">
                            <Text>Loading blocks...</Text>
                          </Td>
                        </Tr>
                      ) : visibleBlocks.length === 0 ? (
                        <Tr>
                          <Td colSpan={5} textAlign="center">
                            <Text>No blocks found</Text>
                          </Td>
                        </Tr>
                      ) : (
                        visibleBlocks.map((block) => (
                          <Tr
                            key={`block-${block.blockHeight}-${block.blockTime}`}
                          >
                            <Td>
                              <Link
                                as={NextLink}
                                href={'/blocks/' + block.blockHeight}
                                style={{ textDecoration: 'none' }}
                                _focus={{ boxShadow: 'none' }}
                              >
                                <Text color={heightLinkColor}>
                                  {block.blockHeight}
                                </Text>
                              </Link>
                            </Td>
                            <Td noOfLines={1}>
                              <CopyableHash hash={Buffer.from(block.appHash.split(',').map(byte => parseInt(byte.trim(), 10)))} />
                            </Td>
                            <Td>
                              {getProposerMoniker(block.proposerAddress)}
                            </Td>
                            <Td>{block.numberOfTx}</Td>
                            <Td>
                              {timeFromNow(block.blockTime)}
                            </Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
                {/* Pagination Controls */}
                <Flex mt={4} justify="space-between" align="center" wrap="wrap" gap={4}>
                  <Flex align="center" gap={2}>
                    <Select
                      w={32}
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      disabled={isLoading}
                    >
                      {[10, 20, 30, 50].map((size) => (
                        <option key={size} value={size}>
                          Show {size}
                        </option>
                      ))}
                    </Select>
                    <Text fontSize="sm" color="gray.500">
                      Page {pageIndex + 1}
                    </Text>
                  </Flex>
                  <Flex align="center" gap={2}>
                    <Tooltip label="First Page">
                      <IconButton
                        onClick={handleFirstPage}
                        disabled={pageIndex === 0 || isLoading}
                        icon={<ArrowLeftIcon h={3} w={3} />}
                        aria-label="First Page"
                        size="sm"
                      />
                    </Tooltip>
                    <Tooltip label="Previous Page">
                      <IconButton
                        onClick={handlePreviousPage}
                        disabled={pageIndex === 0 || isLoading || !pageInfo?.hasPreviousPage}
                        icon={<ChevronLeftIcon h={6} w={6} />}
                        aria-label="Previous Page"
                        size="sm"
                      />
                    </Tooltip>
                    <Tooltip label="Next Page">
                      <IconButton
                        onClick={handleNextPage}
                        disabled={!pageInfo?.hasNextPage || isLoading}
                        icon={<ChevronRightIcon h={6} w={6} />}
                        aria-label="Next Page"
                        size="sm"
                      />
                    </Tooltip>
                  </Flex>
                </Flex>
              </TabPanel>
              {/* TRANSACTIONS TAB - COMMENTED OUT FOR GRAPHQL MIGRATION
              <TabPanel>
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Tx Hash</Th>
                        <Th>Result</Th>
                        <Th>Messages</Th>
                        <Th>Height</Th>
                        <Th>Time</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {txs.map((tx) => (
                        <Tr
                          key={`${toHex(
                            tx.TxEvent.hash
                          )}-${tx.Timestamp.getTime()}`}
                        >
                          <Td>
                            <Link
                              as={NextLink}
                              href={
                                '/txs/' + toHex(tx.TxEvent.hash).toUpperCase()
                              }
                              style={{ textDecoration: 'none' }}
                              _focus={{ boxShadow: 'none' }}
                            >
                              <Text color={txHashColor}>
                                {trimHash(tx.TxEvent.hash)}
                              </Text>
                            </Link>
                          </Td>
                          <Td>
                            {tx.TxEvent.result.code == 0 ? (
                              <Tag variant="subtle" colorScheme="green">
                                <TagLeftIcon as={FiCheck} />
                                <TagLabel>Success</TagLabel>
                              </Tag>
                            ) : (
                              <Tag variant="subtle" colorScheme="red">
                                <TagLeftIcon as={FiX} />
                                <TagLabel>Error</TagLabel>
                              </Tag>
                            )}
                          </Td>
                          <Td>{renderMessages(tx.TxEvent.result.data)}</Td>
                          <Td>{tx.TxEvent.height}</Td>
                          <Td>{timeFromNow(tx.Timestamp.toISOString())}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </TabPanel>
              */}
            </TabPanels>
          </Tabs>
        </Box>
      </main>
    </>
  )
}

export function pubkeyToAddress(pubkey: string): string {
  const hash = sha256(Buffer.from(pubkey, 'base64'))
  return toHex(hash.slice(0, 20)).toLowerCase()
}
