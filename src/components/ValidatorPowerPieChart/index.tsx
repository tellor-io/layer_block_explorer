import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react'
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

const INFO_W = '96px'

export default function ValidatorPowerPieChart() {
  const { validators, isLoading, error } = useLiveValidators()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const panelBg = useColorModeValue('white', 'gray.800')
  const panelBorder = useColorModeValue('gray.200', 'gray.600')
  const muted = useColorModeValue('gray.500', 'gray.400')
  const detailMuted = useColorModeValue('gray.600', 'gray.400')

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

    const total = data.reduce((sum, item) => sum + item.value, 0)
    data.forEach((item) => {
      item.percentage = total ? (item.value / total) * 100 : 0
    })
    data.sort((a, b) => b.value - a.value)

    const MAX_SLICES = 10
    const significant = data.filter(
      (item, i) => item.percentage >= 1 || i < MAX_SLICES
    )
    const others = data.filter(
      (item, i) => item.percentage < 1 && i >= MAX_SLICES
    )

    if (!others.length) return significant

    return [
      ...significant,
      {
        name: `Others (${others.length} validators)`,
        value: others.reduce((sum, item) => sum + item.value, 0),
        address: 'others',
        percentage: others.reduce((sum, item) => sum + item.percentage, 0),
      },
    ]
  }, [validators])

  if (isLoading && !validators.length) {
    return (
      <Flex h="100%" align="center" justify="center">
        <Text fontSize="xs">Loading...</Text>
      </Flex>
    )
  }

  if (error || !chartData.length) {
    return (
      <Flex h="100%" align="center" justify="center" px={2}>
        <Text color={error ? 'red.500' : undefined} fontSize="xs" textAlign="center">
          {error || 'No validators found'}
        </Text>
      </Flex>
    )
  }

  const activeSlice = activeIndex !== null ? chartData[activeIndex] : null

  const onPieClick = (event: { payload?: ChartDataItem }) => {
    const address = event.payload?.address
    if (!address || address === 'others') return
    const url = new URL(window.location.href)
    url.pathname = '/validators'
    url.searchParams.set('highlight', address)
    window.location.href = url.toString()
  }

  return (
    <Flex h="100%" w="100%" align="center" justify="center" gap={2} minH={0} minW={0}>
      {/* Mirror spacer keeps the pie centered while info sits on the right */}
      <Box w={INFO_W} flexShrink={0} />

      {/* Pie fills card height (square) */}
      <Box h="100%" maxW={`calc(100% - ${INFO_W} - ${INFO_W} - 16px)`} sx={{ aspectRatio: '1 / 1' }} flexShrink={1} minW={0}>
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
              outerRadius="96%"
              dataKey="value"
              nameKey="name"
              onClick={onPieClick}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              cursor="pointer"
              paddingAngle={1}
              isAnimationActive={false}
              activeIndex={activeIndex ?? undefined}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.address + index}
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
          </PieChart>
        </ResponsiveContainer>
      </Box>

      <Flex
        w={INFO_W}
        h="100%"
        flexShrink={0}
        direction="column"
        justify="center"
        pt="36px" // clear the top-right react icon
      >
        <Box
          bg={panelBg}
          border="1px solid"
          borderColor={panelBorder}
          borderRadius="md"
          p={1.5}
          pointerEvents="none"
          boxShadow="sm"
        >
          {activeSlice ? (
            <>
              <Text
                fontSize="9px"
                fontWeight="bold"
                lineHeight="1.2"
                mb={0.5}
                wordBreak="break-word"
                whiteSpace="normal"
              >
                {activeSlice.name}
              </Text>
              <Text fontSize="9px" lineHeight="1.2">
                {activeSlice.value.toLocaleString()} TRB
              </Text>
              <Text fontSize="9px" color={detailMuted} lineHeight="1.2">
                {activeSlice.percentage.toFixed(2)}%
              </Text>
            </>
          ) : (
            <Text fontSize="9px" color={muted} textAlign="center" lineHeight="1.2">
              Hover slice for details
            </Text>
          )}
        </Box>
      </Flex>
    </Flex>
  )
}
