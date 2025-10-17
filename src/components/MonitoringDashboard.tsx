import React, { useState, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Grid,
  GridItem,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorModeValue,
} from '@chakra-ui/react'

interface MonitoringData {
  graphql: {
    isHealthy: boolean
    responseTime: number
    uptime: number
    errorRate: number
    totalQueries: number
    successfulQueries: number
    failedQueries: number
    averageResponseTime: number
  }
  rpc: {
    isHealthy: boolean
    responseTime: number
    uptime: number
    errorRate: number
    totalQueries: number
    successfulQueries: number
    failedQueries: number
    averageResponseTime: number
  }
  overall: {
    isHealthy: boolean
    primarySource: string
    fallbackActive: boolean
  }
  recentActivity: {
    errors: Array<{
      timestamp: number
      source: string
      error: string
      query?: string
      endpoint?: string
    }>
    fallbacks: Array<{
      timestamp: number
      fromSource: string
      toSource: string
      reason: string
      query?: string
    }>
  }
  recommendations: string[]
}

export default function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(0)

  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  useEffect(() => {
    fetchMonitoringData()
    const interval = setInterval(fetchMonitoringData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchMonitoringData = async () => {
    try {
      const response = await fetch('/api/health/overall')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const result = await response.json()
      setData(result)
      setLastUpdate(Date.now())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch monitoring data'
      )
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getHealthColor = (isHealthy: boolean) => {
    return isHealthy ? 'green' : 'red'
  }

  const getHealthBadge = (isHealthy: boolean) => {
    return (
      <Badge colorScheme={getHealthColor(isHealthy)} variant="solid">
        {isHealthy ? 'Healthy' : 'Unhealthy'}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Box p={6}>
        <Text>Loading monitoring data...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>Monitoring Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button size="sm" ml={4} onClick={fetchMonitoringData}>
          Retry
        </Button>
      </Alert>
    )
  }

  if (!data) {
    return (
      <Box p={6}>
        <Text>No monitoring data available</Text>
      </Box>
    )
  }

  return (
    <Box
      p={6}
      bg={bgColor}
      borderRadius="lg"
      border="1px"
      borderColor={borderColor}
    >
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <Text fontSize="2xl" fontWeight="bold">
            System Monitoring Dashboard
          </Text>
          <VStack align="end" spacing={1}>
            <Text fontSize="sm" color="gray.500">
              Last updated: {formatTimestamp(lastUpdate)}
            </Text>
            <Button size="sm" onClick={fetchMonitoringData}>
              Refresh
            </Button>
          </VStack>
        </HStack>

        {/* Overall Status */}
        <Alert status={data.overall.isHealthy ? 'success' : 'error'}>
          <AlertIcon />
          <Box>
            <AlertTitle>
              System Status:{' '}
              {data.overall.isHealthy ? 'Operational' : 'Degraded'}
            </AlertTitle>
            <AlertDescription>
              Primary source: {data.overall.primarySource}
              {data.overall.fallbackActive && ' (Fallback active)'}
            </AlertDescription>
          </Box>
        </Alert>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <Alert status="warning">
            <AlertIcon />
            <Box>
              <AlertTitle>Recommendations</AlertTitle>
              <AlertDescription>
                <VStack align="start" spacing={1}>
                  {data.recommendations.map((rec, index) => (
                    <Text key={index} fontSize="sm">
                      • {rec}
                    </Text>
                  ))}
                </VStack>
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Tabs for different views */}
        <Tabs>
          <TabList>
            <Tab>Overview</Tab>
            <Tab>GraphQL</Tab>
            <Tab>RPC</Tab>
            <Tab>Recent Activity</Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel>
              <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                <GridItem>
                  <Box
                    p={4}
                    border="1px"
                    borderColor={borderColor}
                    borderRadius="md"
                  >
                    <Text fontSize="lg" fontWeight="bold" mb={4}>
                      GraphQL Status
                    </Text>
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <Text>Health:</Text>
                        {getHealthBadge(data.graphql.isHealthy)}
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Response Time:</Text>
                        <Text>{formatDuration(data.graphql.responseTime)}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Uptime:</Text>
                        <Text>{data.graphql.uptime.toFixed(1)}%</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Error Rate:</Text>
                        <Text
                          color={
                            data.graphql.errorRate > 5 ? 'red.500' : 'green.500'
                          }
                        >
                          {data.graphql.errorRate.toFixed(1)}%
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                </GridItem>

                <GridItem>
                  <Box
                    p={4}
                    border="1px"
                    borderColor={borderColor}
                    borderRadius="md"
                  >
                    <Text fontSize="lg" fontWeight="bold" mb={4}>
                      RPC Status
                    </Text>
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <Text>Health:</Text>
                        {getHealthBadge(data.rpc.isHealthy)}
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Response Time:</Text>
                        <Text>{formatDuration(data.rpc.responseTime)}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Uptime:</Text>
                        <Text>{data.rpc.uptime.toFixed(1)}%</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Error Rate:</Text>
                        <Text
                          color={
                            data.rpc.errorRate > 5 ? 'red.500' : 'green.500'
                          }
                        >
                          {data.rpc.errorRate.toFixed(1)}%
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                </GridItem>
              </Grid>
            </TabPanel>

            {/* GraphQL Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                  <Stat>
                    <StatLabel>Total Queries</StatLabel>
                    <StatNumber>{data.graphql.totalQueries}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Successful</StatLabel>
                    <StatNumber color="green.500">
                      {data.graphql.successfulQueries}
                    </StatNumber>
                    <StatHelpText>
                      <StatArrow type="increase" />
                      {data.graphql.totalQueries > 0
                        ? (
                            (data.graphql.successfulQueries /
                              data.graphql.totalQueries) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Failed</StatLabel>
                    <StatNumber color="red.500">
                      {data.graphql.failedQueries}
                    </StatNumber>
                  </Stat>
                </Grid>

                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb={4}>
                    Average Response Time
                  </Text>
                  <Progress
                    value={Math.min(
                      data.graphql.averageResponseTime / 1000,
                      10
                    )}
                    max={10}
                    colorScheme={
                      data.graphql.averageResponseTime > 5000 ? 'red' : 'green'
                    }
                    size="lg"
                  />
                  <Text fontSize="sm" mt={2}>
                    {formatDuration(data.graphql.averageResponseTime)}
                  </Text>
                </Box>
              </VStack>
            </TabPanel>

            {/* RPC Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                  <Stat>
                    <StatLabel>Total Queries</StatLabel>
                    <StatNumber>{data.rpc.totalQueries}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Successful</StatLabel>
                    <StatNumber color="green.500">
                      {data.rpc.successfulQueries}
                    </StatNumber>
                    <StatHelpText>
                      <StatArrow type="increase" />
                      {data.rpc.totalQueries > 0
                        ? (
                            (data.rpc.successfulQueries /
                              data.rpc.totalQueries) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Failed</StatLabel>
                    <StatNumber color="red.500">
                      {data.rpc.failedQueries}
                    </StatNumber>
                  </Stat>
                </Grid>

                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb={4}>
                    Average Response Time
                  </Text>
                  <Progress
                    value={Math.min(data.rpc.averageResponseTime / 1000, 10)}
                    max={10}
                    colorScheme={
                      data.rpc.averageResponseTime > 5000 ? 'red' : 'green'
                    }
                    size="lg"
                  />
                  <Text fontSize="sm" mt={2}>
                    {formatDuration(data.rpc.averageResponseTime)}
                  </Text>
                </Box>
              </VStack>
            </TabPanel>

            {/* Recent Activity Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb={4}>
                    Recent Errors
                  </Text>
                  <TableContainer>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Time</Th>
                          <Th>Source</Th>
                          <Th>Error</Th>
                          <Th>Query</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {data.recentActivity.errors
                          .slice(0, 10)
                          .map((error, index) => (
                            <Tr key={index}>
                              <Td>{formatTimestamp(error.timestamp)}</Td>
                              <Td>
                                <Badge
                                  colorScheme={
                                    error.source === 'graphql'
                                      ? 'blue'
                                      : 'orange'
                                  }
                                >
                                  {error.source.toUpperCase()}
                                </Badge>
                              </Td>
                              <Td>{error.error}</Td>
                              <Td>{error.query || 'N/A'}</Td>
                            </Tr>
                          ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>

                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb={4}>
                    Recent Fallbacks
                  </Text>
                  <TableContainer>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Time</Th>
                          <Th>From</Th>
                          <Th>To</Th>
                          <Th>Reason</Th>
                          <Th>Query</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {data.recentActivity.fallbacks
                          .slice(0, 10)
                          .map((fallback, index) => (
                            <Tr key={index}>
                              <Td>{formatTimestamp(fallback.timestamp)}</Td>
                              <Td>
                                <Badge colorScheme="blue">
                                  {fallback.fromSource.toUpperCase()}
                                </Badge>
                              </Td>
                              <Td>
                                <Badge colorScheme="orange">
                                  {fallback.toSource.toUpperCase()}
                                </Badge>
                              </Td>
                              <Td>{fallback.reason}</Td>
                              <Td>{fallback.query || 'N/A'}</Td>
                            </Tr>
                          ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  )
}
