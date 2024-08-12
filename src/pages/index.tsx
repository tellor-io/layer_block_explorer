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

export default function Home() {
  const tmClient = useSelector(selectTmClient)
  const newBlock = useSelector(selectNewBlock)
  const [validators, setValidators] = useState<number>()
  const [isLoaded, setIsLoaded] = useState(false)
  const [status, setStatus] = useState<StatusResponse | null>()
  const [totalVotingPower, setTotalVotingPower] = useState<number>(0)
  const [unstakingAmount, setUnstakingAmount] = useState<number>(0)
  const [allowedAmountExp, setAllowedAmountExp] = useState<number | undefined>(
    undefined
  )
  const [stakingAmount, setStakingAmount] = useState<number>(0)
  const [reporterCount, setReporterCount] = useState<number>(0)

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
        setTotalVotingPower(Number(totalPower))
      })
    }
  }, [tmClient])

  useEffect(() => {
    getAllowedStakingAmount()
      .then((parsedAmount) => {
        if (parsedAmount !== undefined) {
          setStakingAmount(parsedAmount)
        } else {
          console.log('Failed to fetch allowed amount')
        }
      })
      .catch((error) => {
        console.error('Error in getAllowedAmount:', error)
      })
  }, [])

  useEffect(() => {
    getAllowedUnstakingAmount()
      .then((parsedAmounts) => {
        if (parsedAmounts !== undefined) {
          setUnstakingAmount(parsedAmounts)
        } else {
          console.log('Failed to fetch allowed amount')
        }
      })
      .catch((error) => {
        console.error('Error in getAllowedAmount:', error)
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

  useEffect(() => {
    if ((!isLoaded && newBlock) || (!isLoaded && status)) {
      setIsLoaded(true)
    }
  }, [isLoaded, newBlock, status])

  return (
    <>
      <Head>
        <title>Home | Dexplorer</title>
        <meta name="description" content="Home | Dexplorer" />
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
                bgColor="cyan.200"
                color="cyan.600"
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
                bgColor="green.200"
                color="green.600"
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
                bgColor="orange.200"
                color="orange.600"
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
                bgColor="purple.200"
                color="purple.600"
                icon={FiUsers}
                name="Validators"
                value={validators}
              />
            </Skeleton>

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="gray.400"
                color="green.600"
                icon={RiBearSmileFill}
                name="Reporter Count"
                value={reporterCount}
              />
            </Skeleton>

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="blue.200"
                color="blue.600"
                icon={FiUsers}
                name="Total Voting Power (Validators)"
                value={totalVotingPower}
              />
            </Skeleton>

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="blue.900"
                color="white"
                icon={GiAncientSword}
                name="Allowed to Stake"
                value={stakingAmount + ' TRB'}
              />
            </Skeleton>

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="gray.200"
                color="red.600"
                icon={GiSwordBrandish}
                name="Allowed to Unstake"
                value={unstakingAmount + ' TRB'}
              />
            </Skeleton>

            <Skeleton isLoaded={isLoaded}>
              <BoxInfo
                bgColor="gray.900"
                color="red.200"
                icon={LiaHourglassHalfSolid}
                name="Staking Allowance Reset"
                value={
                  allowedAmountExp && new Date(allowedAmountExp).toUTCString()
                }
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
}

const BoxInfo = ({
  bgColor,
  color,
  icon,
  name,
  value,
  ...rest
}: BoxInfoProps) => {
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
        <Heading size={'md'}>{value}</Heading>
      </Box>
      <Text size={'sm'}>{name}</Text>
    </VStack>
  )
}
