import React from 'react'
import { Box, Container, Heading, VStack } from '@chakra-ui/react'
import MonitoringDashboard from '../components/MonitoringDashboard'
import Layout from '../components/Layout'

export default function MonitoringPage() {
  return (
    <Layout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Box>
            <Heading as="h1" size="xl" mb={2}>
              System Monitoring
            </Heading>
            <Box color="gray.600" fontSize="lg">
              Real-time monitoring of GraphQL and RPC data sources, performance
              metrics, and system health.
            </Box>
          </Box>

          <MonitoringDashboard />
        </VStack>
      </Container>
    </Layout>
  )
}
