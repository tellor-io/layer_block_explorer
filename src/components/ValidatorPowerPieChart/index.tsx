import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Box, Text, useColorModeValue } from '@chakra-ui/react'
import { isActiveValidator } from '@/utils/helper'
import { useLiveValidators } from '@/datasources/live/useLiveValidators'

interface ChartDataItem {
  name: string
  value: number
  address: string
  percentage: number
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
  const { validators, isLoading, error } = useLiveValidators()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const chartData = useMemo(() => {
    const active = validators.filter((v) => isActiveValidator(v.bondStatus))
    if (!active.length) return []

    const truncateAddress = (address: string) =>
      `${address.slice(0, 12)}...${address.slice(-4)}`

    const combined = active.reduce(
      (acc, validator) => {
        const moniker = validator.description.moniker || 'Unknown'
        if (moniker === 'layer') {
          acc.push({
            moniker: `layer (${truncateAddress(validator.operatorAddress)})`,
            tokens: validator.tokens,
            operatorAddress: validator.operatorAddress,
          })
        } else {
          const existing = acc.find((v) => v.moniker === moniker)
          if (existing) {
            existing.tokens = (
              BigInt(existing.tokens) + BigInt(validator.tokens)
            ).toString()
          } else {
            acc.push({
              moniker,
              tokens: validator.tokens,
              operatorAddress: validator.operatorAddress,
            })
          }
        }
        return acc
      },
      [] as { moniker: string; tokens: string; operatorAddress: string }[]
    )

    const data: ChartDataItem[] = combined.map((v) => ({
      name: v.moniker,
      value: parseFloat(v.tokens) / 1e6,
      address: v.operatorAddress,
      percentage: 0,
    }))

    const totalTokens = data.reduce((sum, item) => sum + item.value, 0)
    data.forEach((item) => {
      item.percentage = totalTokens ? (item.value / totalTokens) * 100 : 0
    })
    data.sort((a, b) => b.value - a.value)

    const MIN_PERCENTAGE_THRESHOLD = 1
    const MAX_INDIVIDUAL_VALIDATORS = 10
    const significant = data.filter(
      (item, index) =>
        item.percentage >= MIN_PERCENTAGE_THRESHOLD ||
        index < MAX_INDIVIDUAL_VALIDATORS
    )
    const others = data.filter(
      (item, index) =>
        item.percentage < MIN_PERCENTAGE_THRESHOLD &&
        index >= MAX_INDIVIDUAL_VALIDATORS
    )

    return [
      ...significant,
      ...(others.length > 0
        ? [
            {
              name: `Others (${others.length} validators)`,
              value: others.reduce((sum, item) => sum + item.value, 0),
              address: 'others',
              percentage: others.reduce((sum, item) => sum + item.percentage, 0),
            },
          ]
        : []),
    ]
  }, [validators])

  if (isLoading && !validators.length) {
    return (
      <Box height="100%" display="flex" alignItems="center" justifyContent="center">
        <Text>Loading...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box height="100%" display="flex" alignItems="center" justifyContent="center">
        <Text color="red.500" fontSize="sm" px={2} textAlign="center">
          {error}
        </Text>
      </Box>
    )
  }

  if (!chartData.length) {
    return (
      <Box height="100%" display="flex" alignItems="center" justifyContent="center">
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
    const currentAngle = activeIndex * sliceAngle - Math.PI / 2
    const chartRadius = 45
    const tooltipWidth = 160
    const tooltipHeight = 80
    const sliceX = Math.cos(currentAngle) * chartRadius
    const sliceY = Math.sin(currentAngle) * chartRadius
    const tooltipX = 50 + sliceX + Math.cos(currentAngle) * 15
    const tooltipY = 50 + sliceY + Math.sin(currentAngle) * 15
    const isRightSide = Math.cos(currentAngle) > 0
    const isBottomSide = Math.sin(currentAngle) > 0

    let finalX = tooltipX
    let finalY = tooltipY
    const tooltipLeft = tooltipX - tooltipWidth / 2
    const tooltipRight = tooltipX + tooltipWidth / 2
    const tooltipTop = tooltipY - tooltipHeight / 2
    const tooltipBottom = tooltipY + tooltipHeight / 2

    if (tooltipLeft < 100 && tooltipRight > 0) {
      finalX = isRightSide ? 110 : -10
    }
    if (tooltipTop < 100 && tooltipBottom > 0) {
      finalY = isBottomSide ? 110 : -10
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
    const address = event.payload?.address
    if (address && address !== 'others') {
      const url = new URL(window.location.href)
      url.pathname = '/validators'
      url.searchParams.set('highlight', address)
      window.location.href = url.toString()
    }
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
        <Box width="100px" height="100px" position="relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <filter id="desaturate" x="-50%" y="-50%" width="200%" height="200%">
                  <feColorMatrix
                    type="matrix"
                    values="0.5 0 0 0 0 0 0.5 0 0 0 0 0 0.5 0 0 0 0 0 1 0"
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
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
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
                      cursor: entry.address !== 'others' ? 'pointer' : 'default',
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
      <Box position="absolute" bottom="0" left="0" right="0" textAlign="center" height="30px">
        <Text fontSize="med" fontWeight="medium">
          Validator Distribution
        </Text>
      </Box>
    </Box>
  )
}
