/**
 * HYBRID DATA ARCHITECTURE - Dashboard Page
 *
 * Indexer (GraphQL): latest block height/time (GET_SINGLE_LATEST_BLOCK)
 * Live RPC (/api/*): validators, reporters, staking allowances, cycle, supply
 */

import Head from 'next/head'
import {
  useColorModeValue,
  FlexProps,
  Heading,
  Divider,
  HStack,
  Icon,
  Link,
  Text,
  SimpleGrid,
  Box,
  VStack,
  Skeleton,
  Grid,
  GridItem,
} from '@chakra-ui/react'
import {
  FiHome,
  FiChevronRight,
  FiBox,
  FiClock,
  FiCpu,
  FiUsers,
  FiDatabase,
} from 'react-icons/fi'
import { GiAncientSword, GiSwordBrandish } from 'react-icons/gi'
import { LiaHourglassHalfSolid } from 'react-icons/lia'
import { RiBearSmileFill } from 'react-icons/ri'
import { FaUserCheck } from 'react-icons/fa'
import { HiUserGroup } from 'react-icons/hi2'
import { IconType } from 'react-icons'
import NextLink from 'next/link'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { displayDate } from '@/utils/helper'
import { FiDollarSign } from 'react-icons/fi'
import { FiList } from 'react-icons/fi'
import { MdPersonSearch } from 'react-icons/md'
import { BsPersonFillAdd, BsPersonCheck } from 'react-icons/bs'
import axios from 'axios'
import ValidatorPowerPieChart from '@/components/ValidatorPowerPieChart'
import { isActiveValidator } from '@/utils/helper'
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_SINGLE_LATEST_BLOCK } from '@/datasources/graphql/queries'
import { DashboardLatestBlockResponse } from '@/datasources/graphql/types'
import { useLiveValidators } from '@/datasources/live/useLiveValidators'
import { fetchLiveReporters } from '@/datasources/live/reporters'

export default function Home() {
  const BOX_ICON_BG = useColorModeValue('#003734', '#eefffb') // Light mode, Dark mode
  const BOX_ICON_COLOR = useColorModeValue('#eefffb', '#003734') // Light mode, Dark mode

  const router = useRouter()
  const [latestBlockHeight, setLatestBlockHeight] = useState<string | null>(null)
  const [latestBlockTime, setLatestBlockTime] = useState<Date | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [totalVotingPower, setTotalVotingPower] = useState<string | null>(null)
  const [validatorsError, setValidatorsError] = useState<string | null>(null)
  const [reportersError, setReportersError] = useState<string | null>(null)
  const {
    validators: liveValidators,
    error: liveValidatorsError,
  } = useLiveValidators({ pollInterval: 5000 })
  const [stakingAmount, setStakingAmount] = useState<string>('0.0000 TRB')
  const [unstakingAmount, setUnstakingAmount] = useState<string>('0.0000 TRB')
  const [allowedAmountExp, setAllowedAmountExp] = useState<number | undefined>(
    undefined
  )
  const [reporterCount, setReporterCount] = useState<number>(0)
  const [averageGasCost, setAverageGasCost] = useState<string>('0')
  const [currentCycleList, setCurrentCycleList] = useState<string[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [lastNewPairTime, setLastNewPairTime] = useState<Date>(new Date())
  const [pollInterval, setPollInterval] = useState<number>(1000) // Start with 1 second
  const [previousPairCount, setPreviousPairCount] = useState<number>(0)
  const [totalSupply, setTotalSupply] = useState<string>('0 LOYA')

  // Track all polling intervals to ensure cleanup on navigation
  // IMPORTANT: These refs are scoped to THIS component instance only.
  // Each page component (Home, Blocks, etc.) has its own isolated state/refs,
  // so cleaning up Home's intervals will NOT affect intervals created by other pages.
  const intervalsRef = useRef<NodeJS.Timeout[]>([])
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])

  // Cleanup function to clear all intervals and timeouts
  // SAFETY: This only clears intervals stored in THIS component's intervalsRef.
  // It cannot affect intervals managed by other page components since they use
  // separate component instances with their own isolated state/refs.
  const cleanupAllPolling = useCallback(() => {
    intervalsRef.current.forEach((interval) => {
      if (interval) {
        clearInterval(interval)
        console.log('[Home] Cleared polling interval on navigation')
      }
    })
    timeoutsRef.current.forEach((timeout) => {
      if (timeout) {
        clearTimeout(timeout)
        console.log('[Home] Cleared timeout on navigation')
      }
    })
    intervalsRef.current = []
    timeoutsRef.current = []
  }, [])

  // Set up router event listeners to clean up on navigation
  // SAFETY: Router events are global, but this handler only cleans up THIS component's
  // intervals. Other pages' intervals are stored in their own component instances and
  // are unaffected by this cleanup.
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Only clean up if we're navigating away from the home page
      // This ensures we don't accidentally clean up intervals when navigating TO home
      // from another page, or when other pages are navigating between themselves.
      if (router.pathname === '/' && url !== '/') {
        console.log('[Home] Navigating away from home page, cleaning up all polling')
        cleanupAllPolling()
      }
    }

    // Listen for route changes
    router.events.on('routeChangeStart', handleRouteChange)

    // Cleanup on unmount
    return () => {
      router.events.off('routeChangeStart', handleRouteChange)
      // Always clean up on unmount
      cleanupAllPolling()
    }
  }, [router, cleanupAllPolling])

  const activeValidatorCount = liveValidators.filter((v) =>
    isActiveValidator(v.bondStatus)
  ).length

  useEffect(() => {
    if (liveValidatorsError) {
      setValidatorsError(liveValidatorsError)
      setTotalVotingPower(null)
      return
    }
    setValidatorsError(null)
    const active = liveValidators.filter((v) => isActiveValidator(v.bondStatus))
    const totalPower = active.reduce(
      (acc, v) => acc + BigInt(v.tokens || '0'),
      BigInt(0)
    )
    setTotalVotingPower(
      new Intl.NumberFormat().format(Number(totalPower) / 1_000_000)
    )
  }, [liveValidators, liveValidatorsError])

  // Fetch staking amount data
  useEffect(() => {
    const fetchStakingAmount = async () => {
      try {
        const response = await axios.get('/api/staking-amount')
        if (response.data?.amount !== undefined) {
          const numAmount = Number(response.data.amount)
          // Convert from loya to TRB (1 TRB = 1,000,000 loya)
          const trbAmount = numAmount / 1_000_000
          const formattedAmount = !isNaN(trbAmount)
            ? trbAmount.toFixed(4) + ' TRB'
            : '0.0000 TRB'
          setStakingAmount(formattedAmount)
        } else {
          setStakingAmount('0.0000 TRB')
        }
      } catch (error) {
        console.error('Error fetching staking amount:', error)
        setStakingAmount('0.0000 TRB')
      }
    }

    // Initial fetch
    fetchStakingAmount()

    // Set up polling every 10 seconds
    const interval = setInterval(fetchStakingAmount, 10000)
    intervalsRef.current.push(interval)

    return () => {
      clearInterval(interval)
      intervalsRef.current = intervalsRef.current.filter(i => i !== interval)
    }
  }, [])

  useEffect(() => {
    const fetchReporters = async () => {
      try {
        const response = await fetchLiveReporters()
        setReporterCount(response.count)
        setReportersError(null)
      } catch (error) {
        console.error('Error fetching reporters:', error)
        setReportersError(
          error instanceof Error ? error.message : 'Failed to fetch reporters'
        )
      }
    }

    fetchReporters()
    const interval = setInterval(fetchReporters, 5000)
    intervalsRef.current.push(interval)

    return () => {
      clearInterval(interval)
      intervalsRef.current = intervalsRef.current.filter((i) => i !== interval)
    }
  }, [])

  // Fetch unstaking amount data
  useEffect(() => {
    const fetchUnstakingAmount = async () => {
      try {
        const response = await axios.get('/api/unstaking-amount')
        if (response.data?.amount !== undefined) {
          const numAmount = Number(response.data.amount)
          // Convert from loya to TRB (1 TRB = 1,000,000 loya)
          const trbAmount = Math.abs(numAmount) / 1_000_000
          const formattedAmount = !isNaN(trbAmount)
            ? trbAmount.toFixed(4) + ' TRB'
            : '0.0000 TRB'
          setUnstakingAmount(formattedAmount)
        } else {
          setUnstakingAmount('0.0000 TRB')
        }
      } catch (error) {
        console.error('Error fetching unstaking amount:', error)
        setUnstakingAmount('0.0000 TRB')
      }
    }

    // Initial fetch
    fetchUnstakingAmount()

    // Set up polling every 10 seconds
    const interval = setInterval(fetchUnstakingAmount, 10000)
    intervalsRef.current.push(interval)

    return () => {
      clearInterval(interval)
      intervalsRef.current = intervalsRef.current.filter(i => i !== interval)
    }
  }, [])

  // Fetch stake allowance reset time
  useEffect(() => {
    const fetchAllowedAmountExp = async () => {
      try {
        const response = await axios.get('/api/allowed-amount-exp')
        if (response.data?.expiration !== undefined) {
          const timestamp = Number(response.data.expiration)
          if (!isNaN(timestamp)) {
            setAllowedAmountExp(timestamp)
          } else {
            setAllowedAmountExp(undefined)
          }
        } else {
          setAllowedAmountExp(undefined)
        }
      } catch (error) {
        console.error('Error fetching allowed amount exp:', error)
        setAllowedAmountExp(undefined)
      }
    }

    // Initial fetch
    fetchAllowedAmountExp()

    // Set up polling every 10 seconds
    const interval = setInterval(fetchAllowedAmountExp, 10000)
    intervalsRef.current.push(interval)

    return () => {
      clearInterval(interval)
      intervalsRef.current = intervalsRef.current.filter(i => i !== interval)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded && latestBlockHeight) {
      setIsLoaded(true)
    }
  }, [isLoaded, latestBlockHeight])

  // Fetch current cycle list
  useEffect(() => {
    const fetchCycleList = async () => {
      try {
        const response = await axios.get('/api/current-cycle')
        if (response.data?.cycleList && Array.isArray(response.data.cycleList)) {
          const params = response.data.cycleList.map((item: any) => item.queryParams)
          setCurrentCycleList((prev) => {
            const combined = Array.from(new Set([...prev, ...params]))
            return combined
          })
        }
      } catch (error) {
        console.error('Error fetching cycle list:', error)
      }
    }

    // Initial fetch
    fetchCycleList()

    // Set up polling every 3 seconds
    const interval = setInterval(fetchCycleList, 3000)
    intervalsRef.current.push(interval)

    // Stop polling after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval)
      intervalsRef.current = intervalsRef.current.filter(i => i !== interval)
    }, 10000)
    timeoutsRef.current.push(timeout)

    // Cleanup both interval and timeout
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
      intervalsRef.current = intervalsRef.current.filter(i => i !== interval)
      timeoutsRef.current = timeoutsRef.current.filter(t => t !== timeout)
    }
  }, [])

  // GraphQL data fetching for latest block (replaces RPC subscription)
  // This replaces the Redux newBlock state that was populated by RPC subscriptions
  useEffect(() => {
    const fetchLatestBlock = async () => {
      try {
        const response = await graphqlQuery<DashboardLatestBlockResponse>(GET_SINGLE_LATEST_BLOCK)
        
        if (response?.blocks?.edges?.[0]?.node) {
          const block = response.blocks.edges[0].node
          // Update local state instead of Redux (migrated from RPC subscription)
          setLatestBlockHeight(block.blockHeight)
          setLatestBlockTime(new Date(block.blockTime))
        }
      } catch (error) {
        console.error('Error fetching latest block from GraphQL:', error)
      }
    }

    // Initial fetch
    fetchLatestBlock()

    // Set up polling every 3 seconds for latest block
    const interval = setInterval(fetchLatestBlock, 3000)
    intervalsRef.current.push(interval)

    return () => {
      clearInterval(interval)
      intervalsRef.current = intervalsRef.current.filter(i => i !== interval)
    }
  }, [])

  // Fetch total supply
  useEffect(() => {
    const fetchTotalSupply = async () => {
      try {
        const response = await axios.get('/api/supply-by-denom', {
          params: { denom: 'loya' }
        })
        if (response.data?.amount !== undefined) {
          // Backend already converts from loya to TRB and formats with 4 decimals
          const numAmount = Number(response.data.amount.amount)
          const formattedAmount =
            new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 4,
              maximumFractionDigits: 4,
            }).format(numAmount) + ' TRB'
          setTotalSupply(formattedAmount)
        } else {
          setTotalSupply('0.0000 TRB')
        }
      } catch (error) {
        console.error('Error fetching total supply:', error)
        setTotalSupply('0.0000 TRB')
      }
    }

    // Initial fetch
    fetchTotalSupply()

    // Set up polling every 30 seconds (supply doesn't change often)
    const interval = setInterval(fetchTotalSupply, 30000)
    intervalsRef.current.push(interval)

    return () => {
      clearInterval(interval)
      intervalsRef.current = intervalsRef.current.filter(i => i !== interval)
    }
  }, [])


  return (
    <>
      <Head>
        <title>Layer Block Explorer</title>
        <meta name="description" content="Layer Block Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Box as="main" p={4}>
        <VStack spacing={6} align="stretch">
          <Heading size="lg">Network Overview</Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
            <GridItem>
              <Skeleton isLoaded={isLoaded}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={FiBox}
                  name="Latest Block Height"
                  value={latestBlockHeight}
                />
              </Skeleton>
            </GridItem>

            <GridItem>
              <Skeleton isLoaded={isLoaded}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={FiClock}
                  name="Latest Block Time"
                  value={
                    latestBlockTime
                      ? displayDate(latestBlockTime.toISOString())
                      : ''
                  }
                />
              </Skeleton>
            </GridItem>

            <GridItem>
              <Skeleton isLoaded={isLoaded}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={BsPersonFillAdd}
                  name="Reporters"
                  value={reportersError ?? reporterCount}
                  isError={!!reportersError}
                />
              </Skeleton>
            </GridItem>

            <GridItem>
              <Skeleton isLoaded={isLoaded}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={FaUserCheck}
                  name="Validators"
                  value={validatorsError ?? activeValidatorCount}
                  isError={!!validatorsError}
                />
              </Skeleton>
            </GridItem>

            <GridItem>
              <Skeleton isLoaded={isLoaded}>
                <VStack
                  bg={useColorModeValue('light-container', 'dark-container')}
                  borderWidth="1px"
                  borderStyle="solid"
                  borderColor={useColorModeValue('#003734', '#eefffb')}
                  borderRadius={20}
                  p={4}
                  height="150px"
                  width="100%"
                  position="relative"
                >
                  <Box position="absolute" top={0} left={0} right={0} bottom={0}>
                    <ValidatorPowerPieChart />
                  </Box>
                </VStack>
              </Skeleton>
            </GridItem>

            <GridItem>
              <Skeleton isLoaded={isLoaded}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={HiUserGroup}
                  name="Total Voting Power (Val)"
                  value={
                    validatorsError
                      ? validatorsError
                      : totalVotingPower != null
                        ? totalVotingPower + ' TRB'
                        : ''
                  }
                  formatNumber={!validatorsError && totalVotingPower != null}
                  isError={!!validatorsError}
                />
              </Skeleton>
            </GridItem>

            <GridItem>
              <Skeleton isLoaded={isLoaded}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={GiAncientSword}
                  name="Allowed to Stake"
                  value={stakingAmount}
                />
              </Skeleton>
            </GridItem>

            <GridItem>
              <Skeleton isLoaded={isLoaded}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={GiSwordBrandish}
                  name="Allowed to Unstake"
                  value={unstakingAmount}
                />
              </Skeleton>
            </GridItem>

            <GridItem>
              <Skeleton isLoaded={isLoaded}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={LiaHourglassHalfSolid}
                  name="Stake Allowance Reset"
                  value={(() => {
                    return allowedAmountExp && !isNaN(allowedAmountExp)
                      ? new Date(allowedAmountExp).toLocaleString()
                      : 'Not available'
                  })()}
                />
              </Skeleton>
            </GridItem>

            <GridItem colSpan={{ base: 1, md: 2, lg: 2 }}>
              <Skeleton isLoaded={isLoaded}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={FiList}
                  name="Current Cycle List"
                  value={
                    <Box
                      width="100%"
                      maxHeight="50px"
                      overflowY="auto"
                      css={{
                        '&::-webkit-scrollbar': {
                          width: '4px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'transparent',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: useColorModeValue('#003734', '#eefffb'),
                          borderRadius: '2px',
                        },
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'center',
                          gap: '0.25rem',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          lineHeight: '1rem',
                        }}
                      >
                        {currentCycleList.map((pair, index) => (
                          <div key={index} style={{ marginRight: '0.5rem' }}>• {pair}</div>
                        ))}
                      </div>
                    </Box>
                  }
                />
              </Skeleton>
            </GridItem>

            <GridItem>
              <Skeleton isLoaded={isLoaded}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={FiDatabase}
                  name="Total TRB"
                  value={totalSupply}
                  formatNumber={true}
                />
              </Skeleton>
            </GridItem>
          </Grid>
        </VStack>
      </Box>
    </>
  )
}

interface BoxInfoProps extends FlexProps {
  bgColor: string
  color: string
  icon: IconType
  name: string
  value: string | number | React.ReactNode | undefined
  formatNumber?: boolean
  suffix?: string
  isError?: boolean
}

const BoxInfo = ({
  bgColor,
  color,
  icon,
  name,
  value,
  formatNumber = false,
  suffix = '',
  isError = false,
  ...rest
}: BoxInfoProps) => {
  let formattedValue = value
  if (formatNumber && typeof value === 'number') {
    formattedValue = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value)
    if (suffix) {
      formattedValue = `${formattedValue}${suffix}`
    }
  }

  return (
    <VStack
      bg={useColorModeValue('light-container', 'dark-container')}
      borderWidth="1px"
      borderStyle="solid"
      borderColor={useColorModeValue('#003734', '#eefffb')}
      borderRadius={20}
      p={4}
      height="150px"
    >
      <Box
        backgroundColor={bgColor}
        padding={2}
        height="40px"
        width="40px"
        borderRadius={'full'}
        display={'flex'}
        justifyContent={'center'}
        alignItems={'center'}
        mb={2}
      >
        <Icon fontSize="20" color={color} as={icon} />
      </Box>
      <Box textAlign="center">
        <Heading
          size={'md'}
          color={isError ? 'red.500' : undefined}
          fontSize={isError ? 'sm' : undefined}
          noOfLines={isError ? 2 : undefined}
        >
          {formattedValue}
        </Heading>
      </Box>
      <Text size={'sm'}>{name}</Text>
    </VStack>
  )
}
