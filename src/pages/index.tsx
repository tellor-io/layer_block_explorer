/**
 * HYBRID DATA ARCHITECTURE - Dashboard Page
 *
 * Indexer (GraphQL): latest block height/time (GET_SINGLE_LATEST_BLOCK)
 * Live RPC (/api/*): validators, reporters, staking allowances, cycle, supply
 */

import Head from 'next/head'
import {
  useColorModeValue,
  Heading,
  HStack,
  Icon,
  Text,
  Box,
  VStack,
  Skeleton,
  Grid,
  GridItem,
  Flex,
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
import { LiaHourglassHalfSolid, LiaChartPieSolid } from 'react-icons/lia'
import { RiBearSmileFill } from 'react-icons/ri'
import { FaUserCheck } from 'react-icons/fa'
import { HiUserGroup } from 'react-icons/hi2'
import { IconType } from 'react-icons'
import NextLink from 'next/link'
import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react'
import { useRouter } from 'next/router'
import dayjs from 'dayjs'
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
  const BOX_ICON_BG = useColorModeValue('pine.950', 'emerald.500')
  const BOX_ICON_COLOR = useColorModeValue('pine.50', 'pine.950')
  const cardBg = useColorModeValue('light-container', 'dark-container')
  const cardBorder = useColorModeValue('border.light', 'border.dark')
  const scrollThumb = useColorModeValue('pine.950', 'emerald.500')

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
        <title>Tellor Block Explorer</title>
        <meta name="description" content="Tellor Block Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Box
        as="main"
        display="flex"
        flexDirection="column"
        // Fit viewport on laptop+ (3-col). Smaller breakpoints keep natural scroll.
        // 132px = navbar 64 + layout pad 68; short screens use tighter pad (32) → 96.
        h={{ base: 'auto', lg: 'calc(100dvh - 132px)' }}
        minH={0}
        overflow={{ base: 'visible', lg: 'hidden' }}
        sx={{
          '@media (min-width: 62em) and (max-height: 700px)': {
            height: 'calc(100dvh - 96px)',
          },
        }}
      >
        <Box flexShrink={0} mb={{ base: 4, md: 3 }}>
          <Text
            fontSize="11px"
            fontWeight={500}
            letterSpacing="0.14em"
            textTransform="uppercase"
            color={useColorModeValue('opal.500', '#6B928D')}
            mb={1}
          >
            Dashboard
          </Text>
          <Heading
            size="lg"
            fontSize={{ base: '24px', md: 'clamp(22px, 4.2vh, 36px)' }}
            lineHeight="1.05"
          >
            Network Overview
          </Heading>
        </Box>
        <Grid
          flex={{ base: 'none', lg: 1 }}
          minH={0}
          templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
          autoRows={{ base: 'auto', lg: 'minmax(0, 1fr)' }}
          gap={{ base: 3, md: 3, lg: 2.5 }}
          alignContent="stretch"
        >
            <GridItem h="100%" minH={0}>
              <Skeleton isLoaded={isLoaded} borderRadius="2xl" h={{ base: "auto", md: "100%" }}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={FiBox}
                  name="Latest Block Height"
                  value={latestBlockHeight}
                />
              </Skeleton>
            </GridItem>

            <GridItem h="100%" minH={0}>
              <Skeleton isLoaded={isLoaded} h={{ base: "auto", md: "100%" }}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={FiClock}
                  name="Latest Block Time"
                  valueVariant="datetime"
                  value={
                    latestBlockTime
                      ? formatStackedDateTime(latestBlockTime)
                      : ''
                  }
                />
              </Skeleton>
            </GridItem>

            <GridItem h="100%" minH={0}>
              <Skeleton isLoaded={isLoaded} h={{ base: "auto", md: "100%" }}>
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

            <GridItem h="100%" minH={0}>
              <Skeleton isLoaded={isLoaded} h={{ base: "auto", md: "100%" }}>
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

            <GridItem h="100%" minH={0}>
              <Skeleton isLoaded={isLoaded} borderRadius="2xl" h={{ base: 'auto', md: '100%' }}>
                <Box
                  bg={cardBg}
                  borderWidth="1px"
                  borderStyle="solid"
                  borderColor={cardBorder}
                  borderRadius="2xl"
                  height={{ base: '140px', lg: '100%' }}
                  minH={{ base: '140px', lg: 0 }}
                  width="100%"
                  position="relative"
                  overflow="hidden"
                  p={2}
                >
                  <Flex
                    position="absolute"
                    top={2}
                    left={2}
                    right={2}
                    zIndex={2}
                    justify="space-between"
                    align="flex-start"
                    pointerEvents="none"
                  >
                    <Text
                      fontSize="11px"
                      fontWeight={500}
                      letterSpacing="0.12em"
                      textTransform="uppercase"
                      color={useColorModeValue('opal.500', '#6B928D')}
                      noOfLines={2}
                      lineHeight="1.25"
                    >
                      Val Distr.
                    </Text>
                    <Box
                      backgroundColor={BOX_ICON_BG}
                      height={{ base: '32px', md: 'clamp(28px, 4.5vh, 36px)' }}
                      width={{ base: '32px', md: 'clamp(28px, 4.5vh, 36px)' }}
                      borderRadius="full"
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      flexShrink={0}
                      pointerEvents="auto"
                    >
                      <Icon fontSize="16" color={BOX_ICON_COLOR} as={LiaChartPieSolid} />
                    </Box>
                  </Flex>

                  <Box h="100%" w="100%" minH={0}>
                    <ValidatorPowerPieChart />
                  </Box>
                </Box>
              </Skeleton>
            </GridItem>

            <GridItem h="100%" minH={0}>
              <Skeleton isLoaded={isLoaded} h={{ base: "auto", md: "100%" }}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={HiUserGroup}
                  name="Tot Voting Pwr (Val)"
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

            <GridItem h="100%" minH={0}>
              <Skeleton isLoaded={isLoaded} h={{ base: "auto", md: "100%" }}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={GiAncientSword}
                  name="Allowed to Stake"
                  value={stakingAmount}
                />
              </Skeleton>
            </GridItem>

            <GridItem h="100%" minH={0}>
              <Skeleton isLoaded={isLoaded} h={{ base: "auto", md: "100%" }}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={GiSwordBrandish}
                  name="Allowed to Unstake"
                  value={unstakingAmount}
                />
              </Skeleton>
            </GridItem>

            <GridItem h="100%" minH={0}>
              <Skeleton isLoaded={isLoaded} h={{ base: "auto", md: "100%" }}>
                <BoxInfo
                  bgColor={BOX_ICON_BG}
                  color={BOX_ICON_COLOR}
                  icon={LiaHourglassHalfSolid}
                  name="Stake Allowance Reset"
                  valueVariant="datetime"
                  value={
                    allowedAmountExp && !isNaN(allowedAmountExp)
                      ? formatStackedDateTime(allowedAmountExp)
                      : 'Not available'
                  }
                />
              </Skeleton>
            </GridItem>

            {/* Center the leftover 2 cards in the last row on wide layouts */}
            <GridItem colSpan={{ base: 1, md: 2, lg: 3 }} h="100%" minH={0}>
              <Flex
                justify="center"
                gap={{ base: 3, lg: 2.5 }}
                direction={{ base: 'column', md: 'row' }}
                align="stretch"
                h={{ base: 'auto', lg: '100%' }}
                minH={0}
              >
                <Box
                  w={{
                    base: '100%',
                    md: 'calc((100% - 1rem) / 2)',
                    lg: 'calc((100% - 2rem) / 3)',
                  }}
                  flexShrink={0}
                  h={{ base: 'auto', lg: '100%' }}
                  minH={0}
                >
                  <Skeleton isLoaded={isLoaded} borderRadius="2xl" h={{ base: "auto", md: "100%" }}>
                    <BoxInfo
                      bgColor={BOX_ICON_BG}
                      color={BOX_ICON_COLOR}
                      icon={FiList}
                      name="Current Cycle List"
                      valueVariant="content"
                      value={
                        <Box
                          width="100%"
                          height="100%"
                          overflowY="auto"
                          css={{
                            '&::-webkit-scrollbar': {
                              width: '4px',
                            },
                            '&::-webkit-scrollbar-track': {
                              background: 'transparent',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              background: scrollThumb,
                              borderRadius: '2px',
                            },
                          }}
                        >
                          <Box
                            display="grid"
                            gridTemplateColumns="repeat(3, minmax(0, 1fr))"
                            columnGap={2}
                            rowGap={1}
                            fontSize="clamp(8px, 1.5vh, 12px)"
                            fontWeight={500}
                            lineHeight="1.3"
                            textAlign="left"
                          >
                            {currentCycleList.map((pair, index) => (
                              <Text
                                key={index}
                                fontSize="inherit"
                                lineHeight="inherit"
                                noOfLines={1}
                              >
                                • {pair}
                              </Text>
                            ))}
                          </Box>
                        </Box>
                      }
                    />
                  </Skeleton>
                </Box>
                <Box
                  w={{
                    base: '100%',
                    md: 'calc((100% - 1rem) / 2)',
                    lg: 'calc((100% - 2rem) / 3)',
                  }}
                  flexShrink={0}
                  h={{ base: 'auto', lg: '100%' }}
                  minH={0}
                >
                  <Skeleton isLoaded={isLoaded} borderRadius="2xl" h={{ base: "auto", md: "100%" }}>
                    <BoxInfo
                      bgColor={BOX_ICON_BG}
                      color={BOX_ICON_COLOR}
                      icon={FiDatabase}
                      name="Total TRB On Network"
                      value={totalSupply}
                      formatNumber={true}
                    />
                  </Skeleton>
                </Box>
              </Flex>
            </GridItem>
          </Grid>
      </Box>
    </>
  )
}

interface BoxInfoProps {
  bgColor: string
  color: string
  icon: IconType
  name: string
  value: string | number | React.ReactNode | undefined
  formatNumber?: boolean
  suffix?: string
  isError?: boolean
  accent?: boolean
  valueVariant?: 'stat' | 'datetime' | 'content'
}

/** Uniform dashboard datetime: date on top, time below (YYYY-MM-DD / HH:mm:ss). */
const formatStackedDateTime = (value: string | number | Date) => {
  const d = dayjs(value)
  if (!d.isValid()) return 'Not available'
  return (
    <VStack spacing={0} align="center" lineHeight="1.1">
      <Text as="span">{d.format('YYYY-MM-DD')}</Text>
      <Text as="span">{d.format('HH:mm:ss')}</Text>
    </VStack>
  )
}

/** Shrink mono stat text to a single line that fits the card width. */
const AutoFitStat = ({
  children,
  color,
  maxPx = 42,
  minPx = 12,
}: {
  children: React.ReactNode
  color: string
  maxPx?: number
  minPx?: number
}) => {
  const ref = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return

    const fit = () => {
      const availableW = parent.clientWidth
      const availableH = parent.clientHeight
      if (availableW <= 0) return

      let size = Math.min(maxPx, Math.max(minPx, availableH * 0.5))
      el.style.fontSize = `${size}px`
      el.style.whiteSpace = 'nowrap'

      while (size > minPx && el.scrollWidth > availableW) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [children, maxPx, minPx])

  return (
    <Heading
      ref={ref}
      as="h2"
      m={0}
      fontFamily="mono"
      fontWeight={700}
      letterSpacing="-0.02em"
      color={color}
      lineHeight="1.1"
      w="100%"
      textAlign="center"
      whiteSpace="nowrap"
      overflow="hidden"
    >
      {children}
    </Heading>
  )
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
  accent = false,
  valueVariant,
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

  const surfaceBg = useColorModeValue('light-container', 'dark-container')
  const surfaceBorder = useColorModeValue('border.light', 'border.dark')
  const accentBg = useColorModeValue('pine.950', 'emerald.500')
  const accentFg = useColorModeValue('pine.50', 'pine.950')
  const accentLabel = useColorModeValue('rgba(238,255,251,0.7)', 'rgba(0,55,52,0.7)')
  const idleLabel = useColorModeValue('opal.500', '#6B928D')
  const idleValue = useColorModeValue('pine.950', 'pine.50')
  const iconOnAccent = useColorModeValue('rgba(238,255,251,0.12)', 'rgba(0,55,52,0.12)')
  const labelColor = accent ? accentLabel : idleLabel
  const valueColor = accent ? accentFg : isError ? 'red.500' : idleValue

  const resolvedVariant =
    valueVariant ??
    (typeof formattedValue === 'string' || typeof formattedValue === 'number'
      ? 'stat'
      : 'content')
  const isStat = resolvedVariant === 'stat'
  const isDatetime = resolvedVariant === 'datetime'

  return (
    <VStack
      bg={accent ? accentBg : surfaceBg}
      borderWidth="1px"
      borderStyle="solid"
      borderColor={accent ? 'transparent' : surfaceBorder}
      borderRadius="2xl"
      p={{ base: 4, md: 'clamp(10px, 1.6vh, 20px)' }}
      height={{ base: '140px', lg: '100%' }}
      minH={{ base: '140px', lg: 0 }}
      align="stretch"
      justify="flex-start"
      spacing={{ base: 2, md: 1.5 }}
      overflow="hidden"
    >
      <HStack w="100%" justify="space-between" align="flex-start" flexShrink={0}>
        <Text
          fontSize="11px"
          fontWeight={500}
          letterSpacing="0.12em"
          textTransform="uppercase"
          color={labelColor}
          noOfLines={2}
        >
          {name}
        </Text>
        <Box
          backgroundColor={accent ? iconOnAccent : bgColor}
          padding={1.5}
          height={{ base: '36px', md: 'clamp(28px, 4.5vh, 36px)' }}
          width={{ base: '36px', md: 'clamp(28px, 4.5vh, 36px)' }}
          borderRadius="full"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexShrink={0}
        >
          <Icon fontSize="16" color={accent ? accentFg : color} as={icon} />
        </Box>
      </HStack>
      <Flex
        flex={1}
        minH={0}
        w="100%"
        align={isStat || isDatetime ? 'center' : 'stretch'}
        justify={isStat || isDatetime ? 'center' : 'flex-start'}
        overflow="hidden"
      >
        {resolvedVariant === 'content' ? (
          <Box w="100%" h="100%" minH={0} overflow="hidden">
            {formattedValue}
          </Box>
        ) : isStat && !isError ? (
          <AutoFitStat color={valueColor}>{formattedValue}</AutoFitStat>
        ) : (
          <Heading
            size="md"
            fontFamily="mono"
            fontWeight={700}
            letterSpacing="-0.02em"
            color={valueColor}
            fontSize={
              isError
                ? 'sm'
                : { base: '20px', md: 'clamp(16px, 3.6vh, 28px)' }
            }
            lineHeight="1.1"
            noOfLines={isError ? 2 : undefined}
            w="100%"
            minH={0}
            overflow="hidden"
            textAlign="center"
            as="div"
            whiteSpace={isDatetime ? 'normal' : 'nowrap'}
          >
            {formattedValue}
          </Heading>
        )}
      </Flex>
    </VStack>
  )
}
