import {
  useColorModeValue,
  Flex,
  Spinner,
  Box,
  Text,
  VStack,
} from '@chakra-ui/react'
import Head from 'next/head'

export default function LoadingPage({
  message = 'Connecting to Tellor Layer Block Explorer...',
  fullViewport = true,
}: {
  message?: string
  fullViewport?: boolean
}) {
  return (
    <>
      {fullViewport && (
        <Head>
          <title>Tellor Layer Block Explorer</title>
          <meta name="description" content="Tellor Explorer" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
      )}
      <Box
        height={fullViewport ? '100vh' : '50vh'}
        minH={fullViewport ? undefined : '320px'}
        display="flex"
        alignItems="center"
        justifyContent="center"
        width="100%"
      >
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>{message}</Text>
        </VStack>
      </Box>
    </>
  )
}
