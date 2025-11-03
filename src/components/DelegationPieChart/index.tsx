import { useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Box, Text, useColorModeValue } from '@chakra-ui/react'
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_DELEGATIONS_BY_VALIDATOR } from '@/datasources/graphql/queries'
import { DelegationsResponse, Delegation } from '@/datasources/graphql/types'

interface DelegationData {
  delegatorAddress: string
  validatorAddressId: string
  shares: string
}

interface DelegationPieChartProps {
  validatorAddress: string
  width?: number
  height?: number
}

const COLORS = [
  '#00897b',
  '#08d482',
  '#76ffc7',
  '#aeb6cb',
  '#4e597b',
  '#0E5353',
  '#003421',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
]

export default function DelegationPieChart({
  validatorAddress,
  width = 200,
  height = 200,
}: DelegationPieChartProps) {
  const [delegations, setDelegations] = useState<DelegationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    const fetchDelegations = async () => {
      try {
        setIsLoading(true)
        const response = await graphqlQuery<DelegationsResponse>(
          GET_DELEGATIONS_BY_VALIDATOR,
          {
            validatorAddressId: validatorAddress,
            first: 1000 // Get up to 1000 delegations
          }
        )
        
        if (response.delegations?.edges?.length > 0) {
          const delegationData = response.delegations.edges.map(edge => ({
            delegatorAddress: edge.node.delegatorAddress,
            validatorAddressId: edge.node.validatorAddressId,
            shares: edge.node.shares
          }))
          setDelegations(delegationData)
        } else {
          setDelegations([])
        }
      } catch (err) {
        console.error('Error fetching delegations:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to fetch delegations'
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchDelegations()
  }, [validatorAddress])

  if (isLoading) {
    return (
      <Box
        width={width}
        height={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text>Loading...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box
        width={width}
        height={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="red.500">{error}</Text>
      </Box>
    )
  }

  if (delegations.length === 0) {
    return (
      <Box
        width={width}
        height={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text>No delegations found</Text>
      </Box>
    )
  }

  // Transform data for the pie chart
  const chartData = delegations.map((delegation) => {
    const shares = parseFloat(delegation.shares)
    return {
      name: delegation.delegatorAddress,
      value: shares,
      amount: shares, // Using shares as amount since GraphQL doesn't provide balance
      percentage: 0, // Will be calculated below
    }
  })

  // Calculate percentages
  const totalShares = chartData.reduce((sum, item) => sum + item.value, 0)
  chartData.forEach((item) => {
    item.percentage = (item.value / totalShares) * 100
  })

  // Sort by value in descending order
  chartData.sort((a, b) => b.value - a.value)

  // Only show top 5 delegators, combine the rest into "Others"
  const topDelegators = chartData.slice(0, 5)
  const otherDelegators = chartData.slice(5)

  const finalChartData = [
    ...topDelegators,
    ...(otherDelegators.length > 0
      ? [
          {
            name: 'Others',
            value: otherDelegators.reduce((sum, item) => sum + item.value, 0),
            amount: otherDelegators.reduce((sum, item) => sum + item.amount, 0),
            percentage: otherDelegators.reduce(
              (sum, item) => sum + item.percentage,
              0
            ),
          },
        ]
      : []),
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) {
      return (
        <Box
          bg={useColorModeValue('white', 'gray.800')}
          p={3}
          border="1px solid"
          borderColor={useColorModeValue('gray.200', 'gray.600')}
          borderRadius="md"
          boxShadow="md"
          width="180px"
          position="absolute"
          right="0"
          top="50%"
          transform="translateY(-50%)"
        >
          <Text
            fontSize="sm"
            color={useColorModeValue('gray.500', 'gray.400')}
            textAlign="center"
          >
            Hover over a slice to see details
          </Text>
        </Box>
      )
    }

    const data = payload[0].payload
    return (
      <Box
        bg={useColorModeValue('white', 'gray.800')}
        p={3}
        border="1px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
        borderRadius="md"
        boxShadow="md"
        width="180px"
        position="absolute"
        right="0"
        top="50%"
        transform="translateY(-50%)"
      >
        <Text fontSize="sm" fontWeight="bold" noOfLines={1} mb={1}>
          {data.name === 'Others'
            ? 'Other Delegators'
            : `Delegator: ${data.name.slice(0, 10)}...${data.name.slice(-8)}`}
        </Text>
        <Text fontSize="sm">Shares: {data.value.toLocaleString()}</Text>
        <Text fontSize="sm">
          Delegation: {data.value.toLocaleString()} shares
        </Text>
        <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>
          {data.percentage.toFixed(2)}% of total
        </Text>
      </Box>
    )
  }

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(null)
  }

  return (
    <Box width={width} height={height} position="relative" pl={0}>
      <Box
        position="absolute"
        left="120px"
        top="0"
        width="180px"
        height="100%"
        zIndex={1}
      >
        <CustomTooltip
          active={activeIndex !== null}
          payload={
            activeIndex !== null
              ? [
                  {
                    payload: finalChartData[activeIndex],
                  },
                ]
              : []
          }
        />
      </Box>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <defs>
            <filter
              id="desaturate"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feColorMatrix
                type="matrix"
                values="0.5 0 0 0 0
                        0 0.5 0 0 0
                        0 0 0.5 0 0
                        0 0 0 1 0"
              />
            </filter>
          </defs>
          <Pie
            data={finalChartData}
            cx="13%"
            cy="50%"
            labelLine={false}
            outerRadius={50}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
          >
            {finalChartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                filter={
                  activeIndex !== null && activeIndex !== index
                    ? 'url(#desaturate)'
                    : undefined
                }
                style={{
                  transition: 'filter 0.2s ease-in-out',
                }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </Box>
  )
}
