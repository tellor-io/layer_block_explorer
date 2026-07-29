import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Box, Text, useColorModeValue } from '@chakra-ui/react'
import { useValidatorDelegations } from '@/datasources/live/useValidatorDelegations'

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
  const { delegations, isLoading, error } =
    useValidatorDelegations(validatorAddress)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (isLoading) {
    return (
      <Box width={width} height={height} display="flex" alignItems="center" justifyContent="center">
        <Text>Loading...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box width={width} height={height} display="flex" alignItems="center" justifyContent="center">
        <Text color="red.500" fontSize="sm">
          {error}
        </Text>
      </Box>
    )
  }

  if (delegations.length === 0) {
    return (
      <Box width={width} height={height} display="flex" alignItems="center" justifyContent="center">
        <Text>No delegations found</Text>
      </Box>
    )
  }

  const chartData = delegations.map((delegation) => {
    const shares = parseFloat(delegation.shares)
    return {
      name: delegation.delegatorAddress,
      value: shares,
      amount: shares,
      percentage: 0,
    }
  })

  const totalShares = chartData.reduce((sum, item) => sum + item.value, 0)
  chartData.forEach((item) => {
    item.percentage = totalShares ? (item.value / totalShares) * 100 : 0
  })
  chartData.sort((a, b) => b.value - a.value)

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
          <Text fontSize="sm" color={useColorModeValue('gray.500', 'gray.400')} textAlign="center">
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
        <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>
          {data.percentage.toFixed(2)}% of total
        </Text>
      </Box>
    )
  }

  return (
    <Box width={width} height={height} position="relative" pl={0}>
      <Box position="absolute" left="120px" top="0" width="180px" height="100%" zIndex={1}>
        <CustomTooltip
          active={activeIndex !== null}
          payload={
            activeIndex !== null
              ? [{ payload: finalChartData[activeIndex] }]
              : []
          }
        />
      </Box>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <defs>
            <filter id="desaturate" x="-50%" y="-50%" width="200%" height="200%">
              <feColorMatrix
                type="matrix"
                values="0.5 0 0 0 0 0 0.5 0 0 0 0 0 0.5 0 0 0 0 0 1 0"
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
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
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
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </Box>
  )
}
