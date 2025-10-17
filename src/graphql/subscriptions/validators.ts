import { gql } from '@apollo/client'
import { VALIDATOR_FIELDS, VALIDATOR_BASIC_FIELDS } from '../queries/fragments'

/**
 * GraphQL subscriptions for real-time validator updates
 * Now using the updated schema with proper Subscription types
 */

export const SUBSCRIBE_TO_VALIDATOR_UPDATES = gql`
  ${VALIDATOR_FIELDS}
  subscription SubscribeToValidatorUpdates {
    validators {
      id
      mutation_type
      _entity {
        ...ValidatorFields
      }
    }
  }
`

export const SUBSCRIBE_TO_VALIDATOR_UPDATES_BY_STATUS = gql`
  ${VALIDATOR_BASIC_FIELDS}
  subscription SubscribeToValidatorUpdatesByStatus(
    $filter: ValidatorSubscriptionFilter
  ) {
    validators(filter: $filter) {
      id
      mutation_type
      _entity {
        ...ValidatorBasicFields
      }
    }
  }
`

export const SUBSCRIBE_TO_VALIDATOR_UPDATES_BY_STAKE = gql`
  ${VALIDATOR_BASIC_FIELDS}
  subscription SubscribeToValidatorUpdatesByStake(
    $filter: ValidatorSubscriptionFilter
  ) {
    validators(filter: $filter) {
      id
      mutation_type
      _entity {
        ...ValidatorBasicFields
      }
    }
  }
`

export const SUBSCRIBE_TO_VALIDATOR_UPDATES_BY_COMMISSION = gql`
  ${VALIDATOR_BASIC_FIELDS}
  subscription SubscribeToValidatorUpdatesByCommission(
    $filter: ValidatorSubscriptionFilter
  ) {
    validators(filter: $filter) {
      id
      mutation_type
      _entity {
        ...ValidatorBasicFields
      }
    }
  }
`

export const SUBSCRIBE_TO_VALIDATOR_STATUS_CHANGES = gql`
  ${VALIDATOR_BASIC_FIELDS}
  subscription SubscribeToValidatorStatusChanges {
    validators {
      id
      mutation_type
      _entity {
        ...ValidatorBasicFields
      }
    }
  }
`
