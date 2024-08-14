import {
  useColorModeValue,
  Flex,
  Spinner,
  Box,
  Text,
  VStack,
} from '@chakra-ui/react'
import Head from 'next/head'

export default function LoadingPage() {
  return (
    <>
      <Head>
        <title>LayerScan</title>
        <meta name="description" content="Layer Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Box
        height="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Connecting to LayerScan...</Text>
        </VStack>
      </Box>
    </>
  )
}
