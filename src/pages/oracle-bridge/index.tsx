import { useState } from 'react'
import Head from 'next/head'
import {
  Box,
  Button,
  Divider,
  HStack,
  Heading,
  Icon,
  Input,
  Link,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Text,
  useColorModeValue,
  useToast,
  VStack,
  Tooltip,
  IconButton,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { FiChevronRight, FiHome, FiCopy } from 'react-icons/fi'

export default function OracleBridge() {
  const [oracleQueryId, setOracleQueryId] = useState('')
  const [bridgeQueryId, setBridgeQueryId] = useState('')
  const [bridgeTimestamp, setBridgeTimestamp] = useState('')
  const [oracleData, setOracleData] = useState<any>(null)
  const [bridgeData, setBridgeData] = useState<any>(null)
  const [isOracleModalOpen, setIsOracleModalOpen] = useState(false)
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false)
  const [currentSnapshot, setCurrentSnapshot] = useState<string | null>(null)
  const [attestationData, setAttestationData] = useState<any>(null)
  const [isAttestationModalOpen, setIsAttestationModalOpen] = useState(false)
  const toast = useToast()

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message
    return String(error)
  }

  const fetchOracleData = async () => {
    try {
      const response = await fetch(`/api/oracle-data/${oracleQueryId}`)
      const data = await response.json()
      if (response.ok) {
        setOracleData(data)
        setIsOracleModalOpen(true)
      } else {
        throw new Error(data.error || 'Failed to fetch oracle data')
      }
    } catch (error) {
      toast({
        title: 'Error fetching oracle data',
        description: getErrorMessage(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const fetchBridgeData = async () => {
    try {
      const response = await fetch(
        `/api/bridge-data/${bridgeQueryId}/${bridgeTimestamp}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bridge data')
      }

      setBridgeData(data)
      setCurrentSnapshot(data.snapshot)
      setIsBridgeModalOpen(true)
    } catch (error) {
      toast({
        title: 'Error fetching bridge data',
        description: getErrorMessage(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const fetchAttestationData = async () => {
    if (!currentSnapshot) return

    try {
      const response = await fetch(
        `/api/bridge-attestations/${currentSnapshot}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch attestation data')
      }

      setAttestationData(data)
      setIsAttestationModalOpen(true)
    } catch (error) {
      toast({
        title: 'Error fetching attestation data',
        description: getErrorMessage(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2000,
      isClosable: true,
    })
  }

  return (
    <>
      <Head>
        <title>Query ID Station | Layer Explorer</title>
        <meta name="description" content="Query ID Station | Layer Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Query ID Station</Heading>
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
          <Text>Query ID Station</Text>
        </HStack>

        <Box
          mt={8}
          bg={useColorModeValue('light-container', 'dark-container')}
          shadow={'base'}
          borderRadius={4}
          p={4}
        >
          <VStack spacing={4} align="stretch">
            {/* Oracle Section */}
            <Box>
              <Heading size="sm" mb={4}>
                Oracle Data
              </Heading>
              <Text mb={2}>Query ID:</Text>
              <Input
                value={oracleQueryId}
                onChange={(e) => setOracleQueryId(e.target.value)}
                placeholder="Enter oracle query ID"
                mb={4}
              />
              <Button
                onClick={fetchOracleData}
                colorScheme="blue"
                isDisabled={!oracleQueryId}
                width="full"
              >
                Get Oracle Data
              </Button>
            </Box>

            <Divider my={4} />

            {/* Bridge Section */}
            <Box>
              <Heading size="sm" mb={4}>
                Bridge Data
              </Heading>
              <Text mb={2}>Query ID:</Text>
              <Input
                value={bridgeQueryId}
                onChange={(e) => setBridgeQueryId(e.target.value)}
                placeholder="Enter bridge query ID"
                mb={4}
              />
              <Text mb={2}>Timestamp:</Text>
              <Input
                value={bridgeTimestamp}
                onChange={(e) => setBridgeTimestamp(e.target.value)}
                placeholder="Enter timestamp"
                mb={4}
              />
              <VStack spacing={4} width="full">
                <Button
                  onClick={fetchBridgeData}
                  colorScheme="green"
                  isDisabled={!bridgeQueryId || !bridgeTimestamp}
                  width="full"
                >
                  Get Attestation Data
                </Button>
                <Button
                  onClick={fetchAttestationData}
                  colorScheme="blue"
                  isDisabled={!currentSnapshot}
                  width="full"
                >
                  Get Bridge Metadata
                </Button>
              </VStack>
            </Box>
          </VStack>
        </Box>

        <Modal
          isOpen={isOracleModalOpen}
          onClose={() => setIsOracleModalOpen(false)}
          size="xl"
          scrollBehavior="inside"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Oracle Data</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Box
                bg={useColorModeValue('gray.50', 'gray.900')}
                p={4}
                borderRadius="md"
                overflowX="auto"
                position="relative"
              >
                <Tooltip label="Copy to clipboard" placement="top">
                  <IconButton
                    aria-label="Copy to clipboard"
                    icon={<FiCopy />}
                    size="sm"
                    position="absolute"
                    top={2}
                    right={2}
                    onClick={() => copyToClipboard(oracleData)}
                  />
                </Tooltip>
                <pre>{JSON.stringify(oracleData, null, 2)}</pre>
              </Box>
            </ModalBody>
          </ModalContent>
        </Modal>

        <Modal
          isOpen={isBridgeModalOpen}
          onClose={() => setIsBridgeModalOpen(false)}
          size="xl"
          scrollBehavior="inside"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Bridge Data</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Box
                bg={useColorModeValue('gray.50', 'gray.900')}
                p={4}
                borderRadius="md"
                overflowX="auto"
                position="relative"
              >
                <Tooltip label="Copy to clipboard" placement="top">
                  <IconButton
                    aria-label="Copy to clipboard"
                    icon={<FiCopy />}
                    size="sm"
                    position="absolute"
                    top={2}
                    right={2}
                    onClick={() => copyToClipboard(bridgeData)}
                  />
                </Tooltip>
                <pre>{JSON.stringify(bridgeData, null, 2)}</pre>
              </Box>
            </ModalBody>
          </ModalContent>
        </Modal>

        <Modal
          isOpen={isAttestationModalOpen}
          onClose={() => setIsAttestationModalOpen(false)}
          size="xl"
          scrollBehavior="inside"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Attestation Data</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Box
                bg={useColorModeValue('gray.50', 'gray.900')}
                p={4}
                borderRadius="md"
                overflowX="auto"
                position="relative"
              >
                <Tooltip label="Copy to clipboard" placement="top">
                  <IconButton
                    aria-label="Copy to clipboard"
                    icon={<FiCopy />}
                    size="sm"
                    position="absolute"
                    top={2}
                    right={2}
                    onClick={() => copyToClipboard(attestationData)}
                  />
                </Tooltip>
                <pre>{JSON.stringify(attestationData, null, 2)}</pre>
              </Box>
            </ModalBody>
          </ModalContent>
        </Modal>
      </main>
    </>
  )
}
