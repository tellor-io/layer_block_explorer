import { gql } from '@apollo/client'
import { REPORTER_FIELDS } from '../queries/fragments'

/**
 * GraphQL subscriptions for real-time reporter updates
 * Now using the updated schema with proper Subscription types
 */

export const SUBSCRIBE_TO_REPORTER_UPDATES = gql`
  ${REPORTER_FIELDS}
  subscription SubscribeToReporterUpdates {
    reporters {
      id
      mutation_type
      _entity {
        ...ReporterFields
      }
    }
  }
`

export const SUBSCRIBE_TO_REPORTER_UPDATES_BY_STATUS = gql`
  ${REPORTER_FIELDS}
  subscription SubscribeToReporterUpdatesByStatus(
    $filter: ReporterSubscriptionFilter
  ) {
    reporters(filter: $filter) {
      id
      mutation_type
      _entity {
        ...ReporterFields
      }
    }
  }
`

export const SUBSCRIBE_TO_REPORTER_UPDATES_BY_COMMISSION = gql`
  ${REPORTER_FIELDS}
  subscription SubscribeToReporterUpdatesByCommission(
    $filter: ReporterSubscriptionFilter
  ) {
    reporters(filter: $filter) {
      id
      mutation_type
      _entity {
        ...ReporterFields
      }
    }
  }
`

export const SUBSCRIBE_TO_REPORTER_UPDATES_BY_TOKENS = gql`
  ${REPORTER_FIELDS}
  subscription SubscribeToReporterUpdatesByTokens(
    $filter: ReporterSubscriptionFilter
  ) {
    reporters(filter: $filter) {
      id
      mutation_type
      _entity {
        ...ReporterFields
      }
    }
  }
`

export const SUBSCRIBE_TO_REPORTER_STATUS_CHANGES = gql`
  ${REPORTER_FIELDS}
  subscription SubscribeToReporterStatusChanges {
    reporters {
      id
      mutation_type
      _entity {
        ...ReporterFields
      }
    }
  }
`

export const SUBSCRIBE_TO_NEW_REPORTERS = gql`
  ${REPORTER_FIELDS}
  subscription SubscribeToNewReporters {
    reporters {
      id
      mutation_type
      _entity {
        ...ReporterFields
      }
    }
  }
`

export const SUBSCRIBE_TO_SELECTOR_UPDATES = gql`
  subscription SubscribeToSelectorUpdates {
    selectors {
      id
      mutation_type
      _entity {
        id
        reporterAddress
        lockedUntilTime
      }
    }
  }
`

export const SUBSCRIBE_TO_SELECTOR_UPDATES_BY_REPORTER = gql`
  subscription SubscribeToSelectorUpdatesByReporter(
    $filter: SelectorSubscriptionFilter
  ) {
    selectors(filter: $filter) {
      id
      mutation_type
      _entity {
        id
        reporterAddress
        lockedUntilTime
      }
    }
  }
`
