import { gql } from '@apollo/client'
import { TRANSACTION_FIELDS } from '../queries/fragments'

/**
 * GraphQL subscriptions for real-time transaction updates
 * Now using the updated schema with proper Subscription types
 */

export const SUBSCRIBE_TO_NEW_TRANSACTIONS = gql`
  ${TRANSACTION_FIELDS}
  subscription SubscribeToNewTransactions {
    transactions {
      id
      mutation_type
      _entity {
        ...TransactionFields
      }
    }
  }
`

export const SUBSCRIBE_TO_TRANSACTIONS_BY_CRITERIA = gql`
  ${TRANSACTION_FIELDS}
  subscription SubscribeToTransactionsByCriteria(
    $filter: TransactionSubscriptionFilter
  ) {
    transactions(filter: $filter) {
      id
      mutation_type
      _entity {
        ...TransactionFields
      }
    }
  }
`

export const SUBSCRIBE_TO_TRANSACTIONS_BY_BLOCK = gql`
  ${TRANSACTION_FIELDS}
  subscription SubscribeToTransactionsByBlock(
    $filter: TransactionSubscriptionFilter
  ) {
    transactions(filter: $filter) {
      id
      mutation_type
      _entity {
        ...TransactionFields
      }
    }
  }
`

export const SUBSCRIBE_TO_TRANSACTIONS_BY_TIME_RANGE = gql`
  ${TRANSACTION_FIELDS}
  subscription SubscribeToTransactionsByTimeRange(
    $filter: TransactionSubscriptionFilter
  ) {
    transactions(filter: $filter) {
      id
      mutation_type
      _entity {
        ...TransactionFields
      }
    }
  }
`

export const SUBSCRIBE_TO_TRANSACTIONS_BY_ADDRESS = gql`
  ${TRANSACTION_FIELDS}
  subscription SubscribeToTransactionsByAddress(
    $filter: TransactionSubscriptionFilter
  ) {
    transactions(filter: $filter) {
      id
      mutation_type
      _entity {
        ...TransactionFields
      }
    }
  }
`
