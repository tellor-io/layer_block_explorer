import { useState, useEffect } from 'react'
import Head from 'next/head'
import {
  Box,
  Button,
  Divider,
  HStack,
  Heading,
  Icon,
  IconButton,
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
  Code,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { FiChevronRight, FiHome, FiCopy, FiChevronDown } from 'react-icons/fi'
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

// Price pairs data structure
const PRICE_PAIRS = [
  {
    name: 'BTC/USD',
    queryId: 'a6f013ee236804827b77696d350e9f0ac3e879328f2a3021d473a0b778ad78ac',
  },
  {
    name: 'ETH/USD',
    queryId: '83a7f3d48786ac2667503a61e8c415438ed2922eb86a2906e4ee66d9a2ce4992',
  },
  {
    name: 'TRB/USD',
    queryId: '5c13cd9c97dbb98f2429c101a2a8150e6c7a0ddaff6124ee176a3a411067ded0',
  },
  {
    name: 'USDC/USD',
    queryId: '8ee44cd434ed5b0e007eee581fbe0855336f3f84484e8d9989a620a4a49aa0f7',
  },
  {
    name: 'USDT/USD',
    queryId: '68a37787e65e85768d4aa6e385fb15760d46df0f67a18ec032d8fd5848aca264',
  },
  {
    name: 'rETH/USD',
    queryId:
      '0x0bc2d41117ae8779da7623ee76a109c88b84b9bf4d9b404524df04f7d0ca4ca7',
  },
  {
    name: 'tBTC/USD',
    queryId:
      '0x76b504e33305a63a3b80686c0b7bb99e7697466927ba78e224728e80bfaaa0be',
  },
  {
    name: 'KING/USD',
    queryId:
      '0xd62f132d9d04dde6e223d4366c48b47cd9f90228acdc6fa755dab93266db5176',
  },
  {
    name: 'sUSDS/USD',
    queryId:
      '0x59ae85cec665c779f18255dd4f3d97821e6a122691ee070b9a26888bc2a0e45a',
  },
  {
    name: 'USDN/USD',
    queryId:
      '0xe010d752f28dcd2804004d0b57ab1bdc4eca092895d49160204120af11d15f3e',
  },
  {
    name: 'SAGA/USD',
    queryId:
      '0x74c9cfdfd2e4a00a9437bf93bf6051e18e604a976f3fa37faafe0bb5a039431d',
  },
  {
    name: 'sUSDe/USD',
    queryId:
      '0x03731257e35c49e44b267640126358e5decebdd8f18b5e8f229542ec86e318cf',
  },
  {
    name: 'yUSD/USD',
    queryId:
      '0x35155b44678db9e9e021c2cf49dd20c31b49e03415325c2beffb5221cf63882d',
  },
  {
    name: 'wstETH/USD',
    queryId:
      '0x1962cde2f19178fe2bb2229e78a6d386e6406979edc7b9a1966d89d83b3ebf2e',
  },
  {
    name: 'stATOM/USD',
    queryId:
      '0x611fd0e88850bf0cc036d96d04d47605c90b993485c2971e022b5751bbb04f23',
  },
]

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

  const fetchOracleDataBefore = async () => {
    try {
      const response = await fetch(
        `/api/oracle-data-before/${oracleQueryId}/${bridgeTimestamp}`
      )
      const data = await response.json()

      if (response.status === 404) {
        toast({
          title: 'No data found',
          description:
            data.message ||
            'No oracle data found before the specified timestamp',
          status: 'info',
          duration: 5000,
          isClosable: true,
        })
        return
      }

      if (response.ok) {
        setOracleData(data)
        setIsOracleModalOpen(true)
      } else {
        throw new Error(data.error || 'Failed to fetch oracle data before')
      }
    } catch (error) {
      console.error('Oracle data before fetch error:', error)
      toast({
        title: 'Error fetching oracle data before',
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
      }

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
      const bridgeResponse = await fetch(
        `/api/bridge-data/${bridgeQueryId}/${bridgeTimestamp}`
      )
      const bridgeDataResult = await bridgeResponse.json()

      if (!bridgeResponse.ok) {
        throw new Error(bridgeDataResult.error || 'Failed to fetch bridge data')
      }
      setBridgeData(bridgeDataResult)

      const attestResponse = await fetch(
        `/api/bridge-attestations/${bridgeDataResult.snapshot}`
      )
      const attestDataResult = await attestResponse.json()

      if (!attestResponse.ok) {
        throw new Error(
          attestDataResult.error || 'Failed to fetch attestation data'
        )
      }
      setAttestationData(attestDataResult)

      // Fetch EVM validators
      let validatorData = evmValidators
      if (!validatorData) {
        const validatorResponse = await fetch('/api/evm-validators')
        const validatorResult = await validatorResponse.json()

        if (!validatorResponse.ok) {
          throw new Error(
            validatorResult.error || 'Failed to fetch EVM validators'
          )
        }
        validatorData = validatorResult
        setEvmValidators(validatorData)
      }

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
        lastConsensusTimestamp:
          attestDataResult.last_consensus_timestamp || '0',
        previousTimestamp: attestDataResult.previous_report_timestamp || '0',
        nextTimestamp: attestDataResult.next_report_timestamp || '0',
      }

      const attestData = {
        queryId: attestDataResult.query_id,
        report: reportData,
        attestationTimestamp: attestDataResult.attestation_timestamp,
      }

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
        <title>Layer Blobs | Tellor Explorer</title>
        <meta name="description" content="Layer Blobs | Tellor Explorer" />
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
                <Heading size="sm">Data Blobs</Heading>
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
                  <Text>Query ID:</Text>
                  <Box position="relative" width="610px">
                    <Input
                      value={oracleQueryId}
                      onChange={(e) => {
                        setOracleQueryId(e.target.value)
                        setBridgeQueryId(e.target.value)
                      }}
                      placeholder="Enter Layer Query ID or select from dropdown"
                      pr="40px"
                    />
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiChevronDown />}
                        position="absolute"
                        right="1px"
                        top="1px"
                        size="sm"
                        variant="ghost"
                        colorScheme="purple"
                        aria-label="Select price pair"
                      />
                      <MenuList maxH="300px" overflowY="auto">
                        {PRICE_PAIRS.map((pair) => (
                          <MenuItem
                            key={pair.queryId}
                            onClick={() => {
                              setOracleQueryId(pair.queryId)
                              setBridgeQueryId(pair.queryId)
                            }}
                          >
                            {pair.name}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                  </Box>
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
                <HStack spacing={2}>
                  <Text>Timestamp:</Text>
                  <Input
                    value={bridgeTimestamp}
                    onChange={(e) => setBridgeTimestamp(e.target.value)}
                    placeholder="Enter timestamp"
                    width="200px"
                  />
                </HStack>
                <Button
                  onClick={fetchOracleDataBefore}
                  colorScheme="purple"
                  isDisabled={!oracleQueryId || !bridgeTimestamp}
                  size="md"
                  minW="150px"
                  alignSelf="flex-start"
                >
                  Get Data Before
                </Button>
                <Button
                  onClick={generateWithdrawalData}
                  colorScheme="blue"
                  isDisabled={!bridgeQueryId || !bridgeTimestamp}
                  size="md"
                  minW="150px"
                  alignSelf="flex-start"
                >
                  Generate Oracle Proofs Below
                </Button>
              </VStack>
            </Box>

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
                                  const report = attestDataObj.report || {}

                                  const formattedReport = [
                                    report.value || '0x',
                                    (report.timestamp || '0').toString(),
                                    (report.aggregatePower || '0').toString(),
                                    (
                                      report.previousTimestamp || '0'
                                    ).toString(),
                                    (report.nextTimestamp || '0').toString(),
                                    (
                                      report.lastConsensusTimestamp || '0'
                                    ).toString(),
                                  ]

                                  copyToClipboard(
                                    JSON.stringify(formattedReport)
                                  )
                                } catch (error) {
                                  toast({
                                    title: 'Error formatting data',
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
                          <Text>
                            lastConsensusTimestamp (uint256):{' '}
                            {
                              JSON.parse(withdrawalData.attestData || '{}')
                                .report?.lastConsensusTimestamp
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
