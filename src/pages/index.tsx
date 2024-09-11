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
} from '@chakra-ui/react'
import {
  FiHome,
  FiChevronRight,
  FiBox,
  FiClock,
  FiCpu,
  FiUsers,
} from 'react-icons/fi'
import { GiAncientSword, GiSwordBrandish } from 'react-icons/gi'
import { LiaHourglassHalfSolid } from 'react-icons/lia'
import { RiBearSmileFill } from 'react-icons/ri'
import { FaUserCheck } from 'react-icons/fa'
import { HiUserGroup } from 'react-icons/hi2'
import { IconType } from 'react-icons'
import NextLink from 'next/link'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { getValidators } from '@/rpc/query'
import { selectTmClient } from '@/store/connectSlice'
import { selectNewBlock } from '@/store/streamSlice'
import { displayDate } from '@/utils/helper'
import { StatusResponse } from '@cosmjs/tendermint-rpc'
import { getAllowedUnstakingAmount } from '@/rpc/query'
import { getAllowedStakingAmount } from '@/rpc/query'
import { getReporterCount } from '@/rpc/query'
import { getAllowedAmountExp } from '@/rpc/query'
//import { getAverageGasCost } from '@/rpc/query' // Add this import
import { FiDollarSign } from 'react-icons/fi' // Add this import
import { getCurrentCycleList } from '@/rpc/query'
import { FiList } from 'react-icons/fi'

export default function Home() {
  const tmClient = useSelector(selectTmClient)
  const newBlock = useSelector(selectNewBlock)
  const [validators, setValidators] = useState<number>()
  const [isLoaded, setIsLoaded] = useState(false)
  const [status, setStatus] = useState<StatusResponse | null>()
  const [totalVotingPower, setTotalVotingPower] = useState<string>('0')
  const [stakingAmount, setStakingAmount] = useState<string>('0 TRB')
  const [unstakingAmount, setUnstakingAmount] = useState<string>('0 TRB')
  const [allowedAmountExp, setAllowedAmountExp] = useState<number | undefined>(
    undefined
  )
  const [reporterCount, setReporterCount] = useState<number>(0)
  const [averageGasCost, setAverageGasCost] = useState<string>('0')
  const [currentCycleList, setCurrentCycleList] = useState<string>('N/A')

  useEffect(() => {
    if (tmClient) {
      console.log('Fetching status and validators')
      tmClient.status().then((response) => setStatus(response))
      getValidators(tmClient).then((response) => {
        setValidators(response.total)
        const totalPower = response.validators.reduce(
          (acc, validator) => acc + BigInt(validator.votingPower),
          BigInt(0)
        )
        // Format the number with commas
        const formattedTotalPower = new Intl.NumberFormat().format(
          Number(totalPower)
        )
        setTotalVotingPower(formattedTotalPower)
      })
    }
  }, [tmClient])

  useEffect(() => {
    getAllowedStakingAmount()
      .then((amount) => {
        if (amount !== undefined) {
          const formattedAmount =
            new Intl.NumberFormat().format(amount) + ' TRB'
          setStakingAmount(formattedAmount)
        } else {
          setStakingAmount('0 TRB')
        }
      })
      .catch((error) => {
        console.error('Error in getAllowedStakingAmount:', error)
        setStakingAmount('0 TRB')
      })
  }, [])

  useEffect(() => {
    getAllowedUnstakingAmount()
      .then((amount) => {
        if (amount !== undefined) {
          const formattedAmount =
            new Intl.NumberFormat().format(amount) + ' TRB'
          setUnstakingAmount(formattedAmount)
        } else {
          setUnstakingAmount('0 TRB')
        }
      })
      .catch((error) => {
        console.error('Error in getAllowedUnstakingAmount:', error)
        setUnstakingAmount('0 TRB')
      })
  }, [])

  useEffect(() => {
    getAllowedAmountExp()
      .then((parsedAmount) => {
        if (parsedAmount !== undefined) {
          setAllowedAmountExp(parsedAmount)
        } else {
          console.log('Failed to fetch allowed amount exp')
        }
      })
      .catch((error) => {
        console.error('Error in getAllowedAmountExp:', error)
      })
  }, [])

  useEffect(() => {
    getReporterCount()
      .then((parsedAmounts) => {
        if (parsedAmounts !== undefined) {
          setReporterCount(parsedAmounts)
        } else {
          console.log('Failed to fetch allowed amount')
        }
      })
      .catch((error) => {
        console.error('Error in getAllowedAmount:', error)
      })
  }, [])

  /*useEffect(() => {
    getAverageGasCost()
      .then((cost) => {
        if (cost !== undefined) {
          const formattedCost = new Intl.NumberFormat().format(cost) + ' gas'
          setAverageGasCost(formattedCost)
        } else {
          setAverageGasCost('N/A')
        }
      })
      .catch((error) => {
        console.error('Error in getAverageGasCost:', error)
        setAverageGasCost('N/A')
      })
  }, [])*/

  useEffect(() => {
    if ((!isLoaded && newBlock) || (!isLoaded && status)) {
      setIsLoaded(true)
    }
  }, [isLoaded, newBlock, status])

  useEffect(() => {
    const fetchCurrentCycleList = () => {
      getCurrentCycleList()
        .then((dataList) => {
          console.log('Received data list in component:', dataList)
          if (dataList.length > 0) {
            const queryStrings = dataList
              .map((data) => {
                if (data.queryParams && data.queryParams.length > 0) {
                  return data.queryParams.join('/')
                }
                return 'N/A'
              })
              .filter((str) => str !== 'N/A')

            console.log('Query strings:', queryStrings)
            setCurrentCycleList(queryStrings.join(', '))
          } else {
            console.log('No queries found')
            setCurrentCycleList('N/A')
          }
        })
        .catch((error) => {
          console.error('Error in getCurrentCycleList:', error)
          setCurrentCycleList('N/A')
        })
    }

    // Fetch immediately on component mount
    fetchCurrentCycleList()

    // Set up interval to fetch every 10 seconds (adjust as needed)
    const intervalId = setInterval(fetchCurrentCycleList, 500)

    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [])

  return (
    <>
      <Head>
        <title>Home | Layer Explorer</title>
        <meta name="description" content="Home | Layer Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Home</Heading>
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
          <Text>Home</Text>
        </HStack>
        <Box mt={8}>
          <SimpleGrid minChildWidth="200px" spacing="40px">
            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="#066E6B"
                color="#ecfaff"
                icon={FiBox}
                name="Latest Block Height"
                value={
                  newBlock?.header.height
                    ? newBlock?.header.height
                    : status?.syncInfo.latestBlockHeight
                }
              />
            </Skeleton>
            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="#066E6B"
                color="#ecfaff"
                icon={FiClock}
                name="Latest Block Time"
                value={
                  newBlock?.header.time
                    ? displayDate(newBlock?.header.time?.toISOString())
                    : status?.syncInfo.latestBlockTime
                    ? displayDate(
                        status?.syncInfo.latestBlockTime.toISOString()
                      )
                    : ''
                }
              />
            </Skeleton>

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="#066E6B"
                color="#ecfaff"
                icon={FiCpu}
                name="Network"
                value={
                  newBlock?.header.chainId
                    ? newBlock?.header.chainId
                    : status?.nodeInfo.network
                }
              />
            </Skeleton>

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="#066E6B"
                color="#ecfaff"
                icon={FaUserCheck}
                name="Validators"
                value={validators}
              />
            </Skeleton>

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="#066E6B"
                color="#ecfaff"
                icon={RiBearSmileFill}
                name="Reporters"
                value={reporterCount}
              />
            </Skeleton>

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="#066E6B"
                color="#ecfaff"
                icon={HiUserGroup}
                name="Total Voting Power (Validators)"
                value={totalVotingPower + ' TRB'}
                formatNumber={true}
              />
            </Skeleton>

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="#066E6B"
                color="#ecfaff"
                icon={GiAncientSword}
                name="Allowed to Stake"
                value={stakingAmount}
              />
            </Skeleton>

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="#066E6B"
                color="#ecfaff"
                icon={GiSwordBrandish}
                name="Allowed to Unstake"
                value={unstakingAmount}
              />
            </Skeleton>

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="#066E6B"
                color="#ecfaff"
                icon={LiaHourglassHalfSolid}
                name="Stake Allowance Reset"
                value={
                  allowedAmountExp && new Date(allowedAmountExp).toUTCString()
                }
              />
            </Skeleton>

            {/*<Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="#066E6B"
                color="#ecfaff"
                icon={FiDollarSign} // You may need to import this icon
                name="Average Gas Cost"
                value={averageGasCost}
              />
            </Skeleton>*/}

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="#066E6B"
                color="#ecfaff"
                icon={FiList}
                name="Current Cycle List Query"
                value={currentCycleList}
                style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}
              />
            </Skeleton>
          </SimpleGrid>
        </Box>
      </main>
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
}

const BoxInfo = ({
  bgColor,
  color,
  icon,
  name,
  value,
  formatNumber = false,
  suffix = '',
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
      shadow={'base'}
      borderRadius={4}
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
        <Heading size={'md'}>{formattedValue}</Heading>
      </Box>
      <Text size={'sm'}>{name}</Text>
    </VStack>
  )
}
