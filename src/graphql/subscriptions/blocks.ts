import { gql } from '@apollo/client'
import { BLOCK_FIELDS } from '../queries/fragments'

/**
 * Subscribe to new blocks in real-time
 */
export const SUBSCRIBE_TO_NEW_BLOCKS = gql`
  ${BLOCK_FIELDS}
  subscription SubscribeToNewBlocks {
    newBlock {
      ...BlockFields
    }
  }
`

/**
 * Subscribe to blocks with specific criteria
 */
export const SUBSCRIBE_TO_BLOCKS_BY_CRITERIA = gql`
  ${BLOCK_FIELDS}
  subscription SubscribeToBlocksByCriteria($minHeight: BigInt!) {
    newBlock(where: { blockHeight_gte: $minHeight }) {
      ...BlockFields
    }
  }
`
