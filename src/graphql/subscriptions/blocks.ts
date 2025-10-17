import { gql } from '@apollo/client'
import { BLOCK_FIELDS } from '../queries/fragments'

/**
 * GraphQL subscriptions for real-time block updates
 * Now using the updated schema with proper Subscription types
 */

export const SUBSCRIBE_TO_NEW_BLOCKS = gql`
  ${BLOCK_FIELDS}
  subscription SubscribeToNewBlocks {
    blocks {
      id
      mutation_type
      _entity {
        ...BlockFields
      }
    }
  }
`

export const SUBSCRIBE_TO_BLOCKS_BY_CRITERIA = gql`
  ${BLOCK_FIELDS}
  subscription SubscribeToBlocksByCriteria($filter: BlockSubscriptionFilter) {
    blocks(filter: $filter) {
      id
      mutation_type
      _entity {
        ...BlockFields
      }
    }
  }
`
