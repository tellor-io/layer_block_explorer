import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Box, Text, useColorModeValue, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { isActiveValidator } from '@/utils/helper'

interface ValidatorData {
  operator_address: string
  description: {
    moniker: string
  }
  tokens: string
  status: string
}

interface RawValidatorData extends ValidatorData {
  // Add any additional fields that might be in the raw API response
  [key: string]: any
}

interface ValidatorPowerPieChartProps {
  width?: number
  height?: number
}

interface ChartDataItem {
  name: string
  value: number
  address: string
  percentage: number
  raw?: ValidatorData // Make raw optional
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

export default function ValidatorPowerPieChart() {
  const [validators, setValidators] = useState<ValidatorData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const fetchValidators = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/validators')
        if (!response.ok) {
          throw new Error('Failed to fetch validators')
        }
        const data = await response.json()

        if (!isMounted) return

        // Only include active validators using the utility function
        const activeValidators = data.validators.filter((v: ValidatorData) =>
          isActiveValidator(v.status)
        )

        // Verify we have unique addresses
        const addresses = new Set(
          activeValidators.map((v: ValidatorData) => v.operator_address)
        )

        setValidators(activeValidators)
      } catch (err) {
        if (!isMounted) return
        console.error('Error fetching validators:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to fetch validators'
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // Add a small delay to ensure RPC manager has updated when switching endpoints
    const timer = setTimeout(() => {
      fetchValidators()
    }, 100) // 100ms delay

    return () => {
      clearTimeout(timer)
      isMounted = false
    }
  }, [])

  // Move chartData calculation to useMemo at the top level
  const chartData = useMemo(() => {
    if (!validators.length) return []

    // Helper function to truncate address
    const truncateAddress = (address: string) => {
      return `${address.slice(0, 12)}...${address.slice(-4)}`
    }

    // First combine tokens for validators with the same moniker
    const combinedValidators = validators.reduce((acc, validator) => {
      // For Layer validators, keep them separate with truncated addresses
      if (validator.description.moniker === 'layer') {
        acc.push({
          ...validator,
          description: {
            ...validator.description,
            moniker: `layer (${truncateAddress(validator.operator_address)})`,
          },
        })
      } else {
        const existingValidator = acc.find(
          (v) => v.description.moniker === validator.description.moniker
        )
        if (existingValidator) {
          // Add tokens to existing validator
          existingValidator.tokens = (
            BigInt(existingValidator.tokens) + BigInt(validator.tokens)
          ).toString()
        } else {
          // Add new validator
          acc.push({ ...validator })
        }
      }
      return acc
    }, [] as ValidatorData[])

    const data = combinedValidators.map((validator) => {
      // Convert tokens to TRB (divide by 1e6)
      const tokens = parseFloat(validator.tokens) / 1e6

      return {
        name: validator.description.moniker,
        value: tokens,
        address: validator.operator_address,
        percentage: 0, // Will be calculated below
        raw: validator, // Include the raw validator object
      } as ChartDataItem
    })

    // Calculate percentages
    const totalTokens = data.reduce((sum, item) => sum + item.value, 0)
    data.forEach((item) => {
      item.percentage = (item.value / totalTokens) * 100
    })

    // Sort by value in descending order
    data.sort((a, b) => b.value - a.value)

    // Show individual validators that have more than 1% of total power
    // or are in the top 10 by value
    const MIN_PERCENTAGE_THRESHOLD = 1
    const MAX_INDIVIDUAL_VALIDATORS = 10

    const significantValidators = data.filter(
      (item, index) =>
        item.percentage >= MIN_PERCENTAGE_THRESHOLD ||
        index < MAX_INDIVIDUAL_VALIDATORS
    )

    const otherValidators = data.filter(
      (item, index) =>
        item.percentage < MIN_PERCENTAGE_THRESHOLD &&
        index >= MAX_INDIVIDUAL_VALIDATORS
    )

    const finalData = [
      ...significantValidators,
      ...(otherValidators.length > 0
        ? [
            {
              name: `Others (${otherValidators.length} validators)`,
              value: otherValidators.reduce((sum, item) => sum + item.value, 0),
              address: 'others',
              percentage: otherValidators.reduce(
                (sum, item) => sum + item.percentage,
                0
              ),
            },
          ]
        : []),
    ]

    return finalData
  }, [validators])

  if (isLoading) {
    return (
      <Box
        height="100%"
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
        height="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="red.500">{error}</Text>
      </Box>
    )
  }

  if (!validators.length) {
    return (
      <Box
        height="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text>No validators found</Text>
      </Box>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length || activeIndex === null) {
      return null
    }

    const data = payload[0].payload
    const sliceAngle = (2 * Math.PI) / chartData.length
    const currentAngle = activeIndex * sliceAngle - Math.PI / 2 // Start from top
    const chartRadius = 45 // Half of the chart's width/height
    const tooltipRadius = chartRadius + 15 // Closer to the slice
    const tooltipWidth = 160
    const tooltipHeight = 80

    // Calculate the position of the slice's outer edge
    const sliceX = Math.cos(currentAngle) * chartRadius
    const sliceY = Math.sin(currentAngle) * chartRadius

    // Calculate tooltip position based on slice position
    // Move slightly outward from the slice's edge
    const tooltipX = 50 + sliceX + Math.cos(currentAngle) * 15
    const tooltipY = 50 + sliceY + Math.sin(currentAngle) * 15

    // Determine which quadrant the slice is in
    const isRightSide = Math.cos(currentAngle) > 0
    const isBottomSide = Math.sin(currentAngle) > 0

    // Adjust position to prevent overlap with chart
    const chartLeft = 0
    const chartRight = 100
    const chartTop = 0
    const chartBottom = 100

    // Calculate tooltip boundaries
    const tooltipLeft = tooltipX - tooltipWidth / 2
    const tooltipRight = tooltipX + tooltipWidth / 2
    const tooltipTop = tooltipY - tooltipHeight / 2
    const tooltipBottom = tooltipY + tooltipHeight / 2

    // Adjust position if tooltip would overlap chart
    let finalX = tooltipX
    let finalY = tooltipY

    if (tooltipLeft < chartRight && tooltipRight > chartLeft) {
      // Move tooltip to the side of the chart
      finalX = isRightSide ? chartRight + 10 : chartLeft - 10
    }

    if (tooltipTop < chartBottom && tooltipBottom > chartTop) {
      // Move tooltip above/below the chart
      finalY = isBottomSide ? chartBottom + 10 : chartTop - 10
    }

    return (
      <Box
        bg={useColorModeValue('white', 'gray.800')}
        p={2}
        border="1px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
        borderRadius="md"
        boxShadow="md"
        width={`${tooltipWidth}px`}
        position="absolute"
        left={`${finalX}px`}
        top={`${finalY}px`}
        transform="translate(-50%, -50%)"
        zIndex={1000}
        transition="all 0.15s ease-in-out"
        pointerEvents="none"
      >
        <Text fontSize="xs" fontWeight="bold" noOfLines={1} mb={0.5}>
          {data.name}
        </Text>
        <Text fontSize="xs">Power: {data.value.toLocaleString()} TRB</Text>
        <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
          {data.percentage.toFixed(2)}% of total
        </Text>
      </Box>
    )
  }

  const onPieClick = (event: any) => {
    const data = event.payload

    if (!data) return

    // Extract the address from the clicked slice
    const address = data.address

    if (address && address !== 'others') {
      // Use a direct URL change to ensure a full page reload
      const url = new URL(window.location.href)
      url.pathname = '/validators'
      url.searchParams.set('highlight', address)
      window.location.href = url.toString()
    }
  }

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(null)
  }

  return (
    <Box height="100%" position="relative">
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="30px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        width="100%"
        zIndex={1}
      >
        <Box
          width="100px"
          height="100px"
          position="relative"
          style={{ pointerEvents: 'auto' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
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
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius="90%"
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                onClick={onPieClick}
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                cursor="pointer"
                paddingAngle={1}
                isAnimationActive={false}
                activeIndex={activeIndex !== null ? activeIndex : undefined}
              >
                {chartData.map((entry, index) => (
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
                      cursor:
                        entry.address !== 'others' ? 'pointer' : 'default',
                    }}
                  />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip />}
                position={{ x: 0, y: 0 }}
                wrapperStyle={{ zIndex: 1000 }}
                cursor={false}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </Box>
      <Box
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        textAlign="center"
        height="30px"
      >
        <Text fontSize="med" fontWeight="medium">
          Validator Distribution
        </Text>
      </Box>
    </Box>
  )
}
