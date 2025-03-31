import Head from 'next/head'
import { useEffect, useState, useMemo } from 'react'
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
import { CopyableHash } from '@/components/CopyableHash'

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

export default function Blocks() {
  const newBlock = useSelector(selectNewBlock)
  const txEvent = useSelector(selectTxEvent)
  const [blocks, setBlocks] = useState<NewBlockEvent[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [validatorMap, setValidatorMap] = useState<ValidatorMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const iconColor = useColorModeValue('light-theme', 'dark-theme')
  const containerBg = useColorModeValue('light-container', 'dark-container')
  const tabBg = useColorModeValue('light-theme', 'dark-theme')
  const tabTextColor = useColorModeValue('gray.600', 'gray.200')
  const tabHoverColor = useColorModeValue('black', 'black')
  const linkColor = useColorModeValue('light-theme', '#45ffe1')
  const txLinkColor = useColorModeValue('light-theme', 'dark-theme')
  const selectedTextColor = useColorModeValue('white', 'black')
  const selectedBgColor = useColorModeValue('light-theme', 'dark-theme')
  const heightLinkColor = useColorModeValue('light-theme', '#45ffe1')
  const txHashColor = useColorModeValue('light-theme', 'dark-theme')

  const tabStyles = useMemo(
    () => ({
      selected: {
        color: selectedTextColor,
        bg: selectedBgColor,
      },
      hover: {
        bg: 'button-hover',
        color: tabHoverColor,
      },
      normal: {
        color: tabTextColor,
        borderRadius: 5,
      },
    }),
    [selectedTextColor, selectedBgColor, tabHoverColor, tabTextColor]
  )

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
        
        if (!blocksResponse?.data?.block) {
          throw new Error('Invalid block data received')
        }

        const latestBlock = blocksResponse.data.block
        const blocksData = [
          {
            header: {
              version: { block: 0, app: 0 },
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
            txs: latestBlock.data?.txs || [],
            lastCommit: latestBlock.last_commit,
            evidence: latestBlock.evidence,
          },
        ]

        // Fetch previous blocks
        for (let i = 1; i < 10; i++) {
          try {
            const prevBlockResponse = await axios.get(
              `https://tellorlayer.com/cosmos/base/tendermint/v1beta1/blocks/${
                parseInt(latestBlock.header.height) - i
              }`
            )
            
            if (prevBlockResponse?.data?.block) {
              const prevBlock = prevBlockResponse.data.block
              blocksData.push({
                header: {
                  version: { block: 0, app: 0 },
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
                txs: prevBlock.data?.txs || [],
                lastCommit: prevBlock.last_commit,
                evidence: prevBlock.evidence,
              })
            }
          } catch (error) {
            console.warn(`Failed to fetch block at height ${parseInt(latestBlock.header.height) - i}:`, error)
            continue // Skip this block and continue with the next one
          }
        }

        setBlocks(blocksData as NewBlockEvent[])
        setIsLoading(false)
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setError(
            'Failed to fetch data. Please check your network connection.'
          )
        } else {
          setError('An unexpected error occurred.')
        }
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

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

  const updateBlocks = (block: NewBlockEvent) => {
    setBlocks((prevBlocks) => {
      // Ensure block.txs exists
      const newBlock = {
        ...block,
        txs: block.txs || [], // Ensure txs is always an array
      }

      // Check if this exact block already exists
      const exists = prevBlocks.some(
        (existingBlock) =>
          existingBlock.header.height === newBlock.header.height &&
          existingBlock.header.time.getTime() === newBlock.header.time.getTime()
      )

      if (
        !exists &&
        (!prevBlocks.length ||
          newBlock.header.height > prevBlocks[0].header.height)
      ) {
        return [newBlock, ...prevBlocks.slice(0, MAX_ROWS - 1)]
      }
      return prevBlocks
    })
  }

  const updateTxs = (txEvent: TxEvent) => {
    const tx = {
      TxEvent: txEvent,
      Timestamp: new Date(),
    }

    if (txs.length) {
      // Check if transaction already exists in the array using both hash and timestamp
      const exists = txs.some(
        (existingTx) =>
          existingTx.TxEvent.hash === txEvent.hash &&
          existingTx.Timestamp.getTime() === tx.Timestamp.getTime()
      )

      if (!exists && txEvent.height >= txs[0].TxEvent.height) {
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
      const moniker = validatorMap[hexAddress] || 'Unknown'
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

  return (
    <>
      <Head>
        <title>Blocks | Tellor Explorer</title>
        <meta name="description" content="Blocks | Tellor Explorer" />
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
            <Icon fontSize="16" color={iconColor} as={FiHome} />
          </Link>
          <Icon fontSize="16" as={FiChevronRight} />
          <Text>Blocks</Text>
        </HStack>
        <Box mt={8} bg={containerBg} shadow={'base'} borderRadius={4} p={4}>
          <Tabs variant="unstyled">
            <TabList>
              <Tab
                _selected={tabStyles.selected}
                _hover={tabStyles.hover}
                {...tabStyles.normal}
              >
                Blocks
              </Tab>
              <Tab
                _selected={tabStyles.selected}
                _hover={tabStyles.hover}
                {...tabStyles.normal}
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
                      {blocks.map((block) => (
                        <Tr
                          key={`block-${
                            block.header.height
                          }-${block.header.time.getTime()}`}
                        >
                          <Td>
                            <Link
                              as={NextLink}
                              href={'/blocks/' + block.header.height}
                              style={{ textDecoration: 'none' }}
                              _focus={{ boxShadow: 'none' }}
                            >
                              <Text color={heightLinkColor}>
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
                              return null
                            })()}
                          </Td>
                          <Td>{block.txs?.length || 0}</Td>
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
                        <Tr
                          key={`${toHex(
                            tx.TxEvent.hash
                          )}-${tx.Timestamp.getTime()}`}
                        >
                          <Td>
                            <Link
                              as={NextLink}
                              href={
                                '/txs/' + toHex(tx.TxEvent.hash).toUpperCase()
                              }
                              style={{ textDecoration: 'none' }}
                              _focus={{ boxShadow: 'none' }}
                            >
                              <Text color={txHashColor}>
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
