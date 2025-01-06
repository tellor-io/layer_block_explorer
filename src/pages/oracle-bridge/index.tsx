import { useState, useEffect } from 'react'
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
  Code,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { FiChevronRight, FiHome, FiCopy } from 'react-icons/fi'
import { CopyIcon } from '@chakra-ui/icons'
import { deriveSignatures } from '@/utils/signatures'
import { AbiCoder, keccak256, toBeArray, getBytes } from 'ethers'
import { Signature } from 'ethers'
import { InfoOutlineIcon } from '@chakra-ui/icons'

// Define the type for our withdrawal data
interface WithdrawalData {
  attestData?: string
  valset?: string
  sigs?: string
}

// Add this interface
interface SignatureResult {
  signatures: Signature[]
  validators: {
    addr: string
    power: number
  }[]
}

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
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalData>({})
  const [evmValidators, setEvmValidators] = useState<any>(null)
  const [digest, setDigest] = useState<Uint8Array | null>(null)
  const toast = useToast()

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message
    return String(error)
  }

  const fetchOracleData = async () => {
    try {
      const response = await fetch(`/api/oracle-data/${oracleQueryId}`)
      const data = await response.json()
      console.log('Oracle API Response:', data)
      if (response.ok) {
        setOracleData(data)
        setIsOracleModalOpen(true)
      } else {
        throw new Error(data.error || 'Failed to fetch oracle data')
      }
    } catch (error) {
      console.error('Oracle fetch error:', error)
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
    try {
      // Initialize snapshot variable
      let snapshot = currentSnapshot

      // Fetch bridge data if we don't have a snapshot
      if (!snapshot) {
        console.log('Fetching bridge data first to get snapshot...')
        const bridgeResponse = await fetch(
          `/api/bridge-data/${bridgeQueryId}/${bridgeTimestamp}`
        )
        const bridgeDataResult = await bridgeResponse.json()

        if (!bridgeResponse.ok) {
          throw new Error(
            bridgeDataResult.error || 'Failed to fetch bridge data'
          )
        }

        snapshot = bridgeDataResult.snapshot
        setCurrentSnapshot(snapshot)
        setBridgeData(bridgeDataResult)
        console.log('Got snapshot:', snapshot)
      }

      // Now fetch the attestation data using the snapshot
      console.log(
        'Fetching attestation data...',
        `/api/bridge-attestations/${snapshot}`
      )

      const response = await fetch(`/api/bridge-attestations/${snapshot}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch attestation data')
      }

      setAttestationData(data)
      setIsAttestationModalOpen(true)
    } catch (error) {
      console.error('Error in fetchAttestationData:', error)
      toast({
        title: 'Error fetching attestation data',
        description: getErrorMessage(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const fetchEvmValidators = async () => {
    try {
      const response = await fetch('/api/evm-validators')
      const data = await response.json()
      console.log('EVM Validators Response:', data)
      if (response.ok) {
        setEvmValidators(data)
      } else {
        throw new Error(data.error || 'Failed to fetch EVM validators')
      }
    } catch (error) {
      console.error('EVM Validators Error:', error)
      toast({
        title: 'Error fetching EVM validators',
        description: getErrorMessage(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  useEffect(() => {
    fetchEvmValidators()
  }, [])

  const generateWithdrawalData = async () => {
    try {
      console.log('Starting generateWithdrawalData...')

      // Fetch bridge data
      console.log(
        'Fetching bridge data...',
        `/api/bridge-data/${bridgeQueryId}/${bridgeTimestamp}`
      )
      const bridgeResponse = await fetch(
        `/api/bridge-data/${bridgeQueryId}/${bridgeTimestamp}`
      )
      const bridgeDataResult = await bridgeResponse.json()
      console.log('Bridge data response:', bridgeDataResult)

      if (!bridgeResponse.ok) {
        throw new Error(bridgeDataResult.error || 'Failed to fetch bridge data')
      }
      setBridgeData(bridgeDataResult)

      // Fetch attestation data
      console.log(
        'Fetching attestation data...',
        `/api/bridge-attestations/${bridgeDataResult.snapshot}`
      )
      const attestResponse = await fetch(
        `/api/bridge-attestations/${bridgeDataResult.snapshot}`
      )
      const attestDataResult = await attestResponse.json()
      console.log('Attestation data response:', attestDataResult)

      if (!attestResponse.ok) {
        throw new Error(
          attestDataResult.error || 'Failed to fetch attestation data'
        )
      }
      setAttestationData(attestDataResult)

      // Fetch EVM validators
      let validatorData = evmValidators
      if (!validatorData) {
        console.log('Fetching EVM validators...')
        const validatorResponse = await fetch('/api/evm-validators')
        const validatorResult = await validatorResponse.json()
        console.log('Validator data response:', validatorResult)

        if (!validatorResponse.ok) {
          throw new Error(
            validatorResult.error || 'Failed to fetch EVM validators'
          )
        }
        validatorData = validatorResult
        setEvmValidators(validatorData)
      }

      // Log all collected data
      console.log('All collected data:', {
        bridgeData: bridgeDataResult,
        attestationData: attestDataResult,
        validatorData,
      })

      // Verify we have all needed data
      if (!bridgeDataResult || !attestDataResult || !validatorData) {
        throw new Error('Unable to fetch required data')
      }

      const { signatures, validators } = (await deriveSignatures(
        bridgeDataResult.snapshot,
        bridgeDataResult.attestations,
        validatorData.bridge_validator_set
      )) as SignatureResult

      // Create report data from the attestation fields
      const reportData = {
        value: attestDataResult.aggregate_value
          ? `0x${attestDataResult.aggregate_value}`
          : '0x',
        timestamp: attestDataResult.attestation_timestamp || '0',
        aggregatePower: attestDataResult.aggregate_power || '0',
        previousTimestamp: '0',
        nextTimestamp: '0',
      }

      console.log('Mapped Report Data:', reportData)

      const attestData = {
        queryId: attestDataResult.query_id,
        report: reportData,
        attestationTimestamp: attestDataResult.attestation_timestamp,
      }

      console.log('Generated Attest Data:', attestData)

      const formattedWithdrawalData: WithdrawalData = {
        attestData: JSON.stringify(attestData, null, 2),
        valset: JSON.stringify(validators, null, 2),
        sigs: JSON.stringify(
          signatures.map((sig) => ({
            v: sig.v,
            r: sig.r,
            s: sig.s,
          })),
          null,
          2
        ),
      }

      setWithdrawalData(formattedWithdrawalData)
    } catch (error) {
      console.error('Detailed error in generateWithdrawalData:', {
        error,
        bridgeQueryId,
        bridgeTimestamp,
        currentState: {
          bridgeData,
          attestationData,
          evmValidators,
        },
      })
      toast({
        title: 'Error generating withdrawal data',
        description: getErrorMessage(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2000,
    })
  }

  // Update the formatting functions
  const formatValsetForCopy = (valsetData: string) => {
    try {
      const validators = JSON.parse(valsetData)
      return JSON.stringify(
        validators.map((v: any) => [v.addr, v.power.toString()])
      )
    } catch (error) {
      console.error('Error formatting valset data:', error)
      return ''
    }
  }

  const formatSignaturesForCopy = (sigsData: string) => {
    try {
      const signatures = JSON.parse(sigsData)
      return JSON.stringify(
        signatures.map((sig: any) => [sig.v.toString(), sig.r, sig.s])
      )
    } catch (error) {
      console.error('Error formatting signature data:', error)
      return ''
    }
  }

  // Add useEffect to calculate digest when needed data is available
  useEffect(() => {
    if (oracleData && bridgeData) {
      try {
        // Detailed debug logging
        console.log('Oracle Data Structure:', oracleData)

        // Extract data from the correct structure
        const timestamp = oracleData.timestamp
        const aggregate = oracleData.aggregate

        if (!timestamp || !aggregate) {
          throw new Error('Missing required oracle data fields')
        }

        // Ensure queryId is properly formatted as bytes
        const formattedQueryId = oracleQueryId.startsWith('0x')
          ? oracleQueryId
          : '0x' + oracleQueryId

        // Format the data for the digest calculation
        const abiCoder = new AbiCoder()

        console.log('Aggregate data:', aggregate)

        const encodedData = abiCoder.encode(
          [
            'bytes32',
            'tuple(uint256 timestamp, bytes value, uint256 aggregatePower)',
          ],
          [
            getBytes(formattedQueryId),
            {
              timestamp: BigInt(timestamp),
              value: aggregate.value || '0x',
              aggregatePower: BigInt(aggregate.power || 0),
            },
          ]
        )

        // Calculate the digest using keccak256 and convert to byte array
        const calculatedDigest = toBeArray(keccak256(encodedData))

        setDigest(calculatedDigest)
      } catch (error) {
        console.error('Full error details:', error)
        console.error('Data state when error occurred:', {
          oracleData,
          bridgeData,
          oracleQueryId,
        })
        toast({
          title: 'Error calculating digest',
          description: getErrorMessage(error),
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }
  }, [oracleData, bridgeData, oracleQueryId])

  return (
    <>
      <Head>
        <title>Layer Blobs | Layer Explorer</title>
        <meta name="description" content="Layer Blobs | Layer Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Layer Blobs</Heading>
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
          <Text>Layer Blobs</Text>
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
              <HStack spacing={2} mb={4}>
                <Heading size="sm">Query ID</Heading>
                <Tooltip
                  label="View latest report data for this Query ID"
                  fontSize="sm"
                  placement="right"
                >
                  <InfoOutlineIcon color="gray.400" />
                </Tooltip>
              </HStack>
              <VStack spacing={4} align="stretch">
                <HStack spacing={2}>
                  <Input
                    value={oracleQueryId}
                    onChange={(e) => {
                      setOracleQueryId(e.target.value)
                      setBridgeQueryId(e.target.value)
                    }}
                    placeholder="Enter Layer Query ID"
                    width="610px"
                  />
                </HStack>
                <Button
                  onClick={fetchOracleData}
                  colorScheme="purple"
                  isDisabled={!oracleQueryId}
                  size="md"
                  minW="150px"
                  alignSelf="flex-start"
                >
                  View Latest Report Data
                </Button>
              </VStack>
            </Box>

            <Divider my={2} />

            {/* Bridge Section */}
            <Box>
              <HStack spacing={2} mb={4}>
                <Heading size="sm">Data Blobs</Heading>
                <Tooltip
                  label="Generate data using specific timestamps"
                  fontSize="sm"
                  placement="right"
                >
                  <InfoOutlineIcon color="gray.400" />
                </Tooltip>
              </HStack>
              <VStack spacing={4} align="stretch">
                <HStack spacing={2}>
                  <Text>Query ID:</Text>
                  <Text color="gray.500">
                    {bridgeQueryId || 'Waiting for Query ID input above...'}
                  </Text>
                </HStack>
                <HStack spacing={2}>
                  <Text>Timestamp:</Text>
                  <Input
                    value={bridgeTimestamp}
                    onChange={(e) => setBridgeTimestamp(e.target.value)}
                    placeholder="Enter timestamp"
                    width="200px"
                  />
                </HStack>

                <HStack spacing={4} justify="flex-start">
                  <VStack spacing={4} align="flex-start">
                    <HStack spacing={4} justify="flex-start" align="center">
                      <Button
                        onClick={generateWithdrawalData}
                        colorScheme="blue"
                        isDisabled={!bridgeQueryId || !bridgeTimestamp}
                        size="md"
                        minW="150px"
                      >
                        Generate Oracle Proofs
                      </Button>
                    </HStack>
                  </VStack>
                </HStack>
              </VStack>
            </Box>

            {withdrawalData && Object.keys(withdrawalData).length > 0 && (
              <Alert status="success" mt={4} borderRadius="md">
                <AlertIcon />
                <AlertTitle mr={2}>Oracle Proof Generated!</AlertTitle>
                <AlertDescription>
                  The proof data is available below.
                </AlertDescription>
              </Alert>
            )}

            {withdrawalData && (
              <Box mt={4} p={4} borderWidth="1px" borderRadius="md">
                <VStack spacing={4} align="stretch">
                  <Heading size="sm">
                    Generated Oracle Proof for Etherscan
                  </Heading>

                  {/* Attest Data */}
                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      Attest Data
                    </Text>
                    <VStack align="stretch" spacing={2}>
                      <Box>
                        <HStack spacing={2} mb={2}>
                          <Tooltip label="Copy to clipboard">
                            <IconButton
                              aria-label="Copy queryId"
                              icon={<CopyIcon />}
                              size="sm"
                              onClick={() => {
                                const queryId = JSON.parse(
                                  withdrawalData.attestData || '{}'
                                ).queryId
                                if (!queryId) return
                                const formattedQueryId = queryId.startsWith(
                                  '0x'
                                )
                                  ? queryId
                                  : `0x${queryId}`
                                copyToClipboard(formattedQueryId)
                              }}
                            />
                          </Tooltip>
                          <Text fontWeight="semibold">queryId (bytes32):</Text>
                        </HStack>
                        <Text pl={4}>
                          {(() => {
                            const queryId = JSON.parse(
                              withdrawalData.attestData || '{}'
                            ).queryId
                            if (!queryId) return ''
                            return queryId.startsWith('0x')
                              ? queryId
                              : `0x${queryId}`
                          })()}
                        </Text>
                      </Box>
                      <Box>
                        <HStack spacing={2} mb={2}>
                          <Tooltip label="Copy to clipboard">
                            <IconButton
                              aria-label="Copy report"
                              icon={<CopyIcon />}
                              size="sm"
                              onClick={() => {
                                try {
                                  const attestDataObj = JSON.parse(
                                    withdrawalData.attestData || '{}'
                                  )
                                  console.log(
                                    'Parsed attestData:',
                                    attestDataObj
                                  )

                                  const report = attestDataObj.report || {}
                                  console.log(
                                    'Report before formatting:',
                                    report
                                  )

                                  const formattedReport = [
                                    report.value || '0x',
                                    (report.timestamp || '0').toString(),
                                    (report.aggregatePower || '0').toString(),
                                    (
                                      report.previousTimestamp || '0'
                                    ).toString(),
                                    (report.nextTimestamp || '0').toString(),
                                  ]
                                  console.log(
                                    'Formatted report:',
                                    formattedReport
                                  )

                                  copyToClipboard(
                                    JSON.stringify(formattedReport)
                                  )
                                } catch (error) {
                                  console.error('Full error details:', error)
                                  console.error(
                                    'withdrawalData state:',
                                    withdrawalData
                                  )
                                  toast({
                                    title: 'Error copying report',
                                    description: 'Failed to format report data',
                                    status: 'error',
                                    duration: 3000,
                                    isClosable: true,
                                  })
                                }
                              }}
                            />
                          </Tooltip>
                          <Text fontWeight="semibold">report (tuple):</Text>
                        </HStack>
                        <VStack align="stretch" pl={4}>
                          <Text>
                            value (bytes):{' '}
                            {
                              JSON.parse(withdrawalData.attestData || '{}')
                                .report?.value
                            }
                          </Text>
                          <Text>
                            timestamp (uint256):{' '}
                            {
                              JSON.parse(withdrawalData.attestData || '{}')
                                .report?.timestamp
                            }
                          </Text>
                          <Text>
                            aggregatePower (uint256):{' '}
                            {
                              JSON.parse(withdrawalData.attestData || '{}')
                                .report?.aggregatePower
                            }
                          </Text>
                          <Text>
                            previousTimestamp (uint256):{' '}
                            {
                              JSON.parse(withdrawalData.attestData || '{}')
                                .report?.previousTimestamp
                            }
                          </Text>
                          <Text>
                            nextTimestamp (uint256):{' '}
                            {
                              JSON.parse(withdrawalData.attestData || '{}')
                                .report?.nextTimestamp
                            }
                          </Text>
                        </VStack>
                      </Box>
                      <Box>
                        <HStack spacing={2} mb={2}>
                          <Tooltip label="Copy to clipboard">
                            <IconButton
                              aria-label="Copy attestationTimestamp"
                              icon={<CopyIcon />}
                              size="sm"
                              onClick={() =>
                                copyToClipboard(
                                  JSON.parse(withdrawalData.attestData || '{}')
                                    .attestationTimestamp
                                )
                              }
                            />
                          </Tooltip>
                          <Text fontWeight="semibold">
                            attestationTimestamp (uint256):
                          </Text>
                        </HStack>
                        <Text pl={4}>
                          {
                            JSON.parse(withdrawalData.attestData || '{}')
                              .attestationTimestamp
                          }
                        </Text>
                      </Box>
                    </VStack>
                  </Box>

                  {/* Valset */}
                  <Box>
                    <HStack spacing={2} mb={2}>
                      <Tooltip label="Copy to clipboard">
                        <IconButton
                          aria-label="Copy valset"
                          icon={<CopyIcon />}
                          size="sm"
                          onClick={() =>
                            withdrawalData.valset &&
                            copyToClipboard(
                              formatValsetForCopy(withdrawalData.valset)
                            )
                          }
                        />
                      </Tooltip>
                      <Text fontWeight="bold">Valset</Text>
                    </HStack>
                    <Text fontWeight="semibold">_valset (tuple[]):</Text>
                    <VStack align="stretch" pl={4}>
                      {withdrawalData.valset &&
                        JSON.parse(withdrawalData.valset).map(
                          (validator: any, index: number) => (
                            <Box key={index}>
                              <Text>Validator {index + 1}:</Text>
                              <VStack align="stretch" pl={4}>
                                <Text>addr (address): {validator.addr}</Text>
                                <Text>power (uint256): {validator.power}</Text>
                              </VStack>
                            </Box>
                          )
                        )}
                    </VStack>
                  </Box>

                  {/* Signatures */}
                  <Box>
                    <HStack spacing={2} mb={2}>
                      <Tooltip label="Copy to clipboard">
                        <IconButton
                          aria-label="Copy signatures"
                          icon={<CopyIcon />}
                          size="sm"
                          onClick={() =>
                            withdrawalData.sigs &&
                            copyToClipboard(
                              formatSignaturesForCopy(withdrawalData.sigs)
                            )
                          }
                        />
                      </Tooltip>
                      <Text fontWeight="bold">Signatures</Text>
                    </HStack>
                    <Text fontWeight="semibold">_signatures (tuple[]):</Text>
                    <VStack align="stretch" pl={4}>
                      {withdrawalData.sigs &&
                        JSON.parse(withdrawalData.sigs).map(
                          (sig: any, index: number) => (
                            <Box key={index}>
                              <Text>Signature {index + 1}:</Text>
                              <VStack align="stretch" pl={4}>
                                <Text>v (uint8): {sig.v}</Text>
                                <Text>r (bytes32): {sig.r}</Text>
                                <Text>s (bytes32): {sig.s}</Text>
                              </VStack>
                            </Box>
                          )
                        )}
                    </VStack>
                  </Box>
                </VStack>
              </Box>
            )}
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
            <ModalHeader>Latest Report Data</ModalHeader>
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
            <ModalHeader>Bridge MetaData</ModalHeader>
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
