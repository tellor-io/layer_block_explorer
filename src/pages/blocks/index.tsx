import Head from 'next/head'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { pubkeyToAddress as aminoPubkeyToAddress, Pubkey } from '@cosmjs/amino'
import { fromBech32, fromBase64 } from '@cosmjs/encoding'
import { useSelector } from 'react-redux'
import { NewBlockEvent, TxEvent } from '@cosmjs/tendermint-rpc'
import {
  Box,
  Divider,
  HStack,
  Heading,
  Icon,
  Link,
  Table,
  useColorModeValue,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Tag,
  TagLeftIcon,
  TagLabel,
  Tooltip,
  useClipboard,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { FiChevronRight, FiHome, FiCheck, FiX, FiCopy } from 'react-icons/fi'
import { selectNewBlock, selectTxEvent } from '@/store/streamSlice'
import { toHex } from '@cosmjs/encoding'
import { TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { timeFromNow, trimHash, getTypeMsg } from '@/utils/helper'
import { sha256 } from '@cosmjs/crypto'
import { getValidators } from '@/rpc/query'

const MAX_ROWS = 20

interface Tx {
  TxEvent: TxEvent
  Timestamp: Date
}

interface Validator {
  operator_address: string
  consensus_pubkey: {
    '@type': string
    key: string
  }
  description: {
    moniker: string
  }
}

interface ValidatorMap {
  [key: string]: string
}

const CopyableHash = ({ hash }: { hash: Uint8Array }) => {
  const hexHash = toHex(hash)
  const { hasCopied, onCopy } = useClipboard(hexHash)

  return (
    <Tooltip
      label={hasCopied ? 'Copied!' : 'Click to copy full hash'}
      closeOnClick={false}
    >
      <HStack spacing={1} cursor="pointer" onClick={onCopy}>
        <Text>{trimHash(hash)}</Text>
        <Icon as={FiCopy} boxSize={4} />
      </HStack>
    </Tooltip>
  )
}

export default function Blocks() {
  const newBlock = useSelector(selectNewBlock)
  const txEvent = useSelector(selectTxEvent)
  const [blocks, setBlocks] = useState<NewBlockEvent[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [validatorMap, setValidatorMap] = useState<ValidatorMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch validators using new endpoint
        const validatorsResponse = await getValidators()
        if (validatorsResponse?.validators) {
          const map: { [key: string]: string } = {}
          validatorsResponse.validators.forEach((validator: Validator) => {
            const hexAddress = pubkeyToAddress(validator.consensus_pubkey.key)
            map[hexAddress] = validator.description.moniker
          })
          setValidatorMap(map)
        }

        // Fetch blocks
        const blocksResponse = await axios.get(
          'https://tellorlayer.com/cosmos/base/tendermint/v1beta1/blocks/latest'
        )
        const latestBlock = blocksResponse.data.block
        const blocksData = [
          {
            header: {
              version: { block: 0, app: 0 }, // Change to numbers
              height: latestBlock.header.height,
              time: new Date(latestBlock.header.time),
              proposerAddress: fromBase64(latestBlock.header.proposer_address),
              chainId: latestBlock.header.chain_id,
              lastBlockId: latestBlock.header.last_block_id,
              lastCommitHash: fromBase64(latestBlock.header.last_commit_hash),
              dataHash: fromBase64(latestBlock.header.data_hash),
              validatorsHash: fromBase64(latestBlock.header.validators_hash),
              nextValidatorsHash: fromBase64(
                latestBlock.header.next_validators_hash
              ),
              consensusHash: fromBase64(latestBlock.header.consensus_hash),
              appHash: fromBase64(latestBlock.header.app_hash),
              lastResultsHash: fromBase64(latestBlock.header.last_results_hash),
              evidenceHash: fromBase64(latestBlock.header.evidence_hash),
            },
            txs: latestBlock.data.txs,
            lastCommit: latestBlock.last_commit,
            evidence: latestBlock.evidence,
          },
        ]

        // Fetch a few more blocks
        for (let i = 1; i < 10; i++) {
          const prevBlockResponse = await axios.get(
            `https://tellorlayer.com/cosmos/base/tendermint/v1beta1/blocks/${
              parseInt(latestBlock.header.height) - i
            }`
          )
          const prevBlock = prevBlockResponse.data.block
          blocksData.push({
            header: {
              version: { block: 0, app: 0 }, // Change to numbers
              height: prevBlock.header.height,
              time: new Date(prevBlock.header.time),
              proposerAddress: fromBase64(prevBlock.header.proposer_address),
              chainId: prevBlock.header.chain_id,
              lastBlockId: prevBlock.header.last_block_id,
              lastCommitHash: fromBase64(prevBlock.header.last_commit_hash),
              dataHash: fromBase64(prevBlock.header.data_hash),
              validatorsHash: fromBase64(prevBlock.header.validators_hash),
              nextValidatorsHash: fromBase64(
                prevBlock.header.next_validators_hash
              ),
              consensusHash: fromBase64(prevBlock.header.consensus_hash),
              appHash: fromBase64(prevBlock.header.app_hash),
              lastResultsHash: fromBase64(prevBlock.header.last_results_hash),
              evidenceHash: fromBase64(prevBlock.header.evidence_hash),
            },
            txs: prevBlock.data.txs,
            lastCommit: prevBlock.last_commit,
            evidence: prevBlock.evidence,
          })
        }

        setBlocks(blocksData as NewBlockEvent[])
        setIsLoading(false)
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('Axios error:', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
          })
          // Handle the error appropriately in your UI
          // For example:
          setError(
            'Failed to fetch data. Please check your network connection.'
          )
        } else {
          console.error('Unexpected error:', error)
          setError('An unexpected error occurred.')
        }
      }
    }
    fetchData()
  }, [])

  const fetchValidators = async () => {
    try {
      const response = await axios.get('https://tellorlayer.com/rpc/validators')
      const validators = response.data.result.validators

      const validatorMap: { [key: string]: string } = {}
      validators.forEach((validator: any) => {
        // Use the address directly without conversion
        validatorMap[validator.address] = validator.moniker
      })

      console.log('Validator Map:', validatorMap)
      setValidatorMap(validatorMap)
    } catch (error) {
      console.error('Error fetching validators:', error)
    }
  }

  const updateBlocks = (block: NewBlockEvent) => {
    if (blocks.length) {
      if (block.header.height > blocks[0].header.height) {
        setBlocks((prevBlocks) => [block, ...prevBlocks.slice(0, MAX_ROWS - 1)])
      }
    } else {
      setBlocks([block])
    }
  }

  const updateTxs = (txEvent: TxEvent) => {
    const tx = {
      TxEvent: txEvent,
      Timestamp: new Date(),
    }
    if (txs.length) {
      if (
        txEvent.height >= txs[0].TxEvent.height &&
        txEvent.hash != txs[0].TxEvent.hash
      ) {
        setTxs((prevTx) => [tx, ...prevTx.slice(0, MAX_ROWS - 1)])
      }
    } else {
      setTxs([tx])
    }
  }

  const getProposerMoniker = (proposerAddress: Uint8Array) => {
    try {
      const hexAddress = Buffer.from(proposerAddress)
        .toString('hex')
        .toLowerCase()
      console.log('Proposer Hex Address:', hexAddress)
      const moniker = validatorMap[hexAddress] || 'Unknown'
      console.log('Found Moniker:', moniker)
      return moniker
    } catch (error) {
      console.error('Error converting proposer address:', error)
      return 'Unknown'
    }
  }

  const renderMessages = (data: Uint8Array | undefined) => {
    if (data) {
      const txBody = TxBody.decode(data)
      const messages = txBody.messages

      if (messages.length == 1) {
        return (
          <HStack>
            <Tag colorScheme="cyan">{getTypeMsg(messages[0].typeUrl)}</Tag>
          </HStack>
        )
      } else if (messages.length > 1) {
        return (
          <HStack>
            <Tag colorScheme="cyan">{getTypeMsg(messages[0].typeUrl)}</Tag>
            <Text textColor="cyan.800">+{messages.length - 1}</Text>
          </HStack>
        )
      }
    }

    return ''
  }

  const tabColor = useColorModeValue('light-theme', 'dark-theme')

  useEffect(() => {
    if (newBlock) {
      updateBlocks(newBlock)
    }
  }, [newBlock])

  useEffect(() => {
    if (txEvent) {
      updateTxs(txEvent)
    }
  }, [txEvent])

  return (
    <>
      <Head>
        <title>Blocks | Layer Explorer</title>
        <meta name="description" content="Blocks | Layer Explorer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <HStack h="24px">
          <Heading size={'md'}>Blocks</Heading>
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
          <Text>Blocks</Text>
        </HStack>
        <Box
          mt={8}
          bg={useColorModeValue('light-container', 'dark-container')}
          shadow={'base'}
          borderRadius={4}
          p={4}
        >
          <Tabs variant="unstyled">
            <TabList>
              <Tab
                _selected={{
                  color: useColorModeValue('white', 'black'),
                  bg: tabColor,
                }}
                _hover={{
                  bg: 'button-hover',
                  color: useColorModeValue('black', 'black'),
                }}
                color={useColorModeValue('gray.600', 'gray.200')}
                borderRadius={5}
              >
                Blocks
              </Tab>
              <Tab
                _selected={{
                  color: useColorModeValue('white', 'black'),
                  bg: tabColor,
                }}
                _hover={{
                  bg: 'button-hover',
                  color: useColorModeValue('black', 'black'),
                }}
                color={useColorModeValue('gray.600', 'gray.200')}
                borderRadius={5}
              >
                Transactions
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Height</Th>
                        <Th>App Hash</Th>
                        <Th>Proposer</Th>
                        <Th>Txs</Th>
                        <Th>Time</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {blocks.map((block, index) => (
                        <Tr key={`${block.header.height}-${index}`}>
                          <Td>
                            <Link
                              as={NextLink}
                              href={'/blocks/' + block.header.height}
                              style={{ textDecoration: 'none' }}
                              _focus={{ boxShadow: 'none' }}
                            >
                              <Text
                                color={useColorModeValue(
                                  'light-theme',
                                  '#45ffe1'
                                )}
                              >
                                {block.header.height}
                              </Text>
                            </Link>
                          </Td>
                          <Td noOfLines={1}>
                            <CopyableHash hash={block.header.appHash} />
                          </Td>
                          <Td>
                            {validatorMap[
                              toHex(block.header.proposerAddress)
                            ] || 'Unknown'}
                            {(() => {
                              console.log(
                                `Block Proposer Address: ${toHex(
                                  block.header.proposerAddress
                                )}, Mapped Moniker: ${
                                  validatorMap[
                                    toHex(block.header.proposerAddress)
                                  ] || 'Unknown'
                                }`
                              )
                              return null
                            })()}
                          </Td>
                          <Td>{block.txs.length}</Td>
                          <Td>
                            {timeFromNow(block.header.time.toISOString())}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </TabPanel>
              <TabPanel>
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Tx Hash</Th>
                        <Th>Result</Th>
                        <Th>Messages</Th>
                        <Th>Height</Th>
                        <Th>Time</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {txs.map((tx) => (
                        <Tr key={toHex(tx.TxEvent.hash)}>
                          <Td>
                            <Link
                              as={NextLink}
                              href={
                                '/txs/' + toHex(tx.TxEvent.hash).toUpperCase()
                              }
                              style={{ textDecoration: 'none' }}
                              _focus={{ boxShadow: 'none' }}
                            >
                              <Text
                                color={useColorModeValue(
                                  'light-theme',
                                  'dark-theme'
                                )}
                              >
                                {trimHash(tx.TxEvent.hash)}
                              </Text>
                            </Link>
                          </Td>
                          <Td>
                            {tx.TxEvent.result.code == 0 ? (
                              <Tag variant="subtle" colorScheme="green">
                                <TagLeftIcon as={FiCheck} />
                                <TagLabel>Success</TagLabel>
                              </Tag>
                            ) : (
                              <Tag variant="subtle" colorScheme="red">
                                <TagLeftIcon as={FiX} />
                                <TagLabel>Error</TagLabel>
                              </Tag>
                            )}
                          </Td>
                          <Td>{renderMessages(tx.TxEvent.result.data)}</Td>
                          <Td>{tx.TxEvent.height}</Td>
                          <Td>{timeFromNow(tx.Timestamp.toISOString())}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </main>
    </>
  )
}

export function pubkeyToAddress(pubkey: string): string {
  const hash = sha256(Buffer.from(pubkey, 'base64'))
  return toHex(hash.slice(0, 20)).toLowerCase()
}
