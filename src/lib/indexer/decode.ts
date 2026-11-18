// Turns the GraphQL API's block and transaction rows into the shapes the pages render, decoding the compressed JSON blobs.
import { decodeBlob } from '../blobCodec'
import type {
  Block,
  BlockNode,
  Transaction,
  TransactionNode,
} from '../../datasources/graphql/types'
import { hashFieldToBytes } from '../../utils/helper'

// A bytea column arrives as hex text with a \x or 0x prefix or none; an empty column decodes to empty text
function decodeCompressedText(
  kind: 'transaction' | 'voteExtension',
  hex: string
): string {
  const bytes = hashFieldToBytes(hex)
  return bytes.length === 0 ? '' : decodeBlob(kind, bytes)
}

export function decodeTransactionText(node: TransactionNode): string {
  if (typeof node.txDataCompressed === 'string') {
    return decodeCompressedText('transaction', node.txDataCompressed)
  }
  if (typeof node.txData === 'string') return node.txData
  throw new Error(`transaction ${node.id} carries no transaction data`)
}

export function toTransaction(node: TransactionNode): Transaction {
  return {
    nodeId: node.nodeId,
    id: node.id,
    txData: decodeTransactionText(node),
    blockHeight: node.blockHeight,
    timestamp: node.timestamp,
  }
}

// Empty when the block has no vote extension transaction, which is what the column held before it was compressed
export function decodeVoteExtensionsText(node: BlockNode): string {
  if (typeof node.voteExtensionsCompressed === 'string') {
    return decodeCompressedText('voteExtension', node.voteExtensionsCompressed)
  }
  if (typeof node.voteExtensions === 'string') return node.voteExtensions
  return ''
}

export function toBlock(node: BlockNode): Block {
  return {
    blockHeight: node.blockHeight,
    blockHash: node.blockHash,
    blockTime: node.blockTime,
    proposerAddress: node.proposerAddress,
    numberOfTx: node.numberOfTx,
    appHash: node.appHash,
    chainId: node.chainId,
    voteExtensions: decodeVoteExtensionsText(node),
    consensusHash: node.consensusHash,
    dataHash: node.dataHash,
    evidenceHash: node.evidenceHash,
    nextValidatorsHash: node.nextValidatorsHash,
    validatorsHash: node.validatorsHash,
  }
}
