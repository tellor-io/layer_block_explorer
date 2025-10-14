import { gql } from '@apollo/client'
import { AGGREGATE_REPORT_FIELDS } from './fragments'

// ============================================================================
// AGGREGATE REPORT QUERIES
// ============================================================================

/**
 * Get all aggregate reports
 */
export const GET_AGGREGATE_REPORTS = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query GetAggregateReports {
    aggregateReports {
      ...AggregateReportFields
    }
  }
`

/**
 * Get aggregate reports with pagination
 */
export const GET_AGGREGATE_REPORTS_PAGINATED = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query GetAggregateReportsPaginated($limit: Int!, $offset: Int!) {
    aggregateReports(
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...AggregateReportFields
    }
  }
`

/**
 * Get aggregate reports by query ID
 */
export const GET_AGGREGATE_REPORTS_BY_QUERY_ID = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query GetAggregateReportsByQueryId($queryId: String!, $limit: Int!, $offset: Int!) {
    aggregateReports(
      where: { queryId_eq: $queryId }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...AggregateReportFields
    }
  }
`

/**
 * Get aggregate reports by timestamp range
 */
export const GET_AGGREGATE_REPORTS_BY_TIME_RANGE = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query GetAggregateReportsByTimeRange($startTime: DateTime!, $endTime: DateTime!, $limit: Int!, $offset: Int!) {
    aggregateReports(
      where: {
        and: [
          { timestamp_gte: $startTime }
          { timestamp_lte: $endTime }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...AggregateReportFields
    }
  }
`

/**
 * Get aggregate reports by block height range
 */
export const GET_AGGREGATE_REPORTS_BY_BLOCK_RANGE = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query GetAggregateReportsByBlockRange($minBlock: BigInt!, $maxBlock: BigInt!, $limit: Int!, $offset: Int!) {
    aggregateReports(
      where: {
        and: [
          { blockHeight_gte: $minBlock }
          { blockHeight_lte: $maxBlock }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...AggregateReportFields
    }
  }
`

/**
 * Get flagged aggregate reports
 */
export const GET_FLAGGED_AGGREGATE_REPORTS = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query GetFlaggedAggregateReports($limit: Int!, $offset: Int!) {
    aggregateReports(
      where: { flagged_eq: true }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...AggregateReportFields
    }
  }
`

/**
 * Get non-flagged aggregate reports
 */
export const GET_NON_FLAGGED_AGGREGATE_REPORTS = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query GetNonFlaggedAggregateReports($limit: Int!, $offset: Int!) {
    aggregateReports(
      where: { flagged_eq: false }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...AggregateReportFields
    }
  }
`

/**
 * Get cyclist aggregate reports
 */
export const GET_CYCLIST_AGGREGATE_REPORTS = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query GetCyclistAggregateReports($limit: Int!, $offset: Int!) {
    aggregateReports(
      where: { cyclist_eq: true }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...AggregateReportFields
    }
  }
`

/**
 * Get aggregate reports by total reporters range
 */
export const GET_AGGREGATE_REPORTS_BY_REPORTER_COUNT = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query GetAggregateReportsByReporterCount($minReporters: Int!, $maxReporters: Int!, $limit: Int!, $offset: Int!) {
    aggregateReports(
      where: {
        and: [
          { totalReporters_gte: $minReporters }
          { totalReporters_lte: $maxReporters }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...AggregateReportFields
    }
  }
`

/**
 * Get aggregate reports by total power range
 */
export const GET_AGGREGATE_REPORTS_BY_POWER_RANGE = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query GetAggregateReportsByPowerRange($minPower: BigInt!, $maxPower: BigInt!, $limit: Int!, $offset: Int!) {
    aggregateReports(
      where: {
        and: [
          { totalPower_gte: $minPower }
          { totalPower_lte: $maxPower }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...AggregateReportFields
    }
  }
`

/**
 * Search aggregate reports by query ID or value
 */
export const SEARCH_AGGREGATE_REPORTS = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query SearchAggregateReports($searchTerm: String!, $limit: Int!, $offset: Int!) {
    aggregateReports(
      where: {
        or: [
          { queryId_containsInsensitive: $searchTerm }
          { value_containsInsensitive: $searchTerm }
          { queryData_containsInsensitive: $searchTerm }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...AggregateReportFields
    }
  }
`

/**
 * Get aggregate report count for statistics
 */
export const GET_AGGREGATE_REPORT_COUNT = gql`
  query GetAggregateReportCount {
    aggregateReportsConnection {
      totalCount
    }
  }
`

/**
 * Get aggregate report statistics
 */
export const GET_AGGREGATE_REPORT_STATS = gql`
  query GetAggregateReportStats {
    aggregateReportsConnection {
      totalCount
    }
    aggregateReportsConnection(where: { flagged_eq: true }) {
      totalCount
    }
    aggregateReportsConnection(where: { cyclist_eq: true }) {
      totalCount
    }
    aggregateReports(orderBy: timestamp, orderDirection: desc, first: 1) {
      timestamp
    }
    aggregateReports(orderBy: timestamp, orderDirection: asc, first: 1) {
      timestamp
    }
  }
`

// ============================================================================
// MICRO REPORT QUERIES
// ============================================================================

/**
 * Get all micro reports
 */
export const GET_MICRO_REPORTS = gql`
  query GetMicroReports {
    microReports {
      id
      queryId
      queryIdHeight
      metaId
      height
      reporter
      power
      cycleList
    }
  }
`

/**
 * Get micro reports with pagination
 */
export const GET_MICRO_REPORTS_PAGINATED = gql`
  query GetMicroReportsPaginated($limit: Int!, $offset: Int!) {
    microReports(
      first: $limit
      skip: $offset
      orderBy: height
      orderDirection: desc
    ) {
      id
      queryId
      queryIdHeight
      metaId
      height
      reporter
      power
      cycleList
    }
  }
`

/**
 * Get micro reports by query ID
 */
export const GET_MICRO_REPORTS_BY_QUERY_ID = gql`
  query GetMicroReportsByQueryId($queryId: String!, $limit: Int!, $offset: Int!) {
    microReports(
      where: { queryId_eq: $queryId }
      first: $limit
      skip: $offset
      orderBy: height
      orderDirection: desc
    ) {
      id
      queryId
      queryIdHeight
      metaId
      height
      reporter
      power
      cycleList
    }
  }
`

/**
 * Get micro reports by reporter address
 */
export const GET_MICRO_REPORTS_BY_REPORTER = gql`
  query GetMicroReportsByReporter($reporter: String!, $limit: Int!, $offset: Int!) {
    microReports(
      where: { reporter_eq: $reporter }
      first: $limit
      skip: $offset
      orderBy: height
      orderDirection: desc
    ) {
      id
      queryId
      queryIdHeight
      metaId
      height
      reporter
      power
      cycleList
    }
  }
`

/**
 * Get micro reports by meta ID
 */
export const GET_MICRO_REPORTS_BY_META_ID = gql`
  query GetMicroReportsByMetaId($metaId: String!, $limit: Int!, $offset: Int!) {
    microReports(
      where: { metaId_eq: $metaId }
      first: $limit
      skip: $offset
      orderBy: height
      orderDirection: desc
    ) {
      id
      queryId
      queryIdHeight
      metaId
      height
      reporter
      power
      cycleList
    }
  }
`

/**
 * Get micro reports by block height range
 */
export const GET_MICRO_REPORTS_BY_BLOCK_RANGE = gql`
  query GetMicroReportsByBlockRange($minBlock: BigInt!, $maxBlock: BigInt!, $limit: Int!, $offset: Int!) {
    microReports(
      where: {
        and: [
          { height_gte: $minBlock }
          { height_lte: $maxBlock }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: height
      orderDirection: desc
    ) {
      id
      queryId
      queryIdHeight
      metaId
      height
      reporter
      power
      cycleList
    }
  }
`

/**
 * Get micro reports by power range
 */
export const GET_MICRO_REPORTS_BY_POWER_RANGE = gql`
  query GetMicroReportsByPowerRange($minPower: BigInt!, $maxPower: BigInt!, $limit: Int!, $offset: Int!) {
    microReports(
      where: {
        and: [
          { power_gte: $minPower }
          { power_lte: $maxPower }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: height
      orderDirection: desc
    ) {
      id
      queryId
      queryIdHeight
      metaId
      height
      reporter
      power
      cycleList
    }
  }
`

/**
 * Get cycle list micro reports
 */
export const GET_CYCLE_LIST_MICRO_REPORTS = gql`
  query GetCycleListMicroReports($limit: Int!, $offset: Int!) {
    microReports(
      where: { cycleList_eq: true }
      first: $limit
      skip: $offset
      orderBy: height
      orderDirection: desc
    ) {
      id
      queryId
      queryIdHeight
      metaId
      height
      reporter
      power
      cycleList
    }
  }
`

/**
 * Get micro report count for statistics
 */
export const GET_MICRO_REPORT_COUNT = gql`
  query GetMicroReportCount {
    microReportsConnection {
      totalCount
    }
  }
`

/**
 * Get micro report statistics
 */
export const GET_MICRO_REPORT_STATS = gql`
  query GetMicroReportStats {
    microReportsConnection {
      totalCount
    }
    microReportsConnection(where: { cycleList_eq: true }) {
      totalCount
    }
    microReports(orderBy: height, orderDirection: desc, first: 1) {
      height
    }
    microReports(orderBy: height, orderDirection: asc, first: 1) {
      height
    }
  }
`

// ============================================================================
// META ID AGGREGATE QUERIES
// ============================================================================

/**
 * Get all meta ID aggregates
 */
export const GET_META_ID_AGGREGATES = gql`
  query GetMetaIdAggregates {
    metaIdAggregates {
      id
      totalPower
      reporterCount
    }
  }
`

/**
 * Get meta ID aggregates with pagination
 */
export const GET_META_ID_AGGREGATES_PAGINATED = gql`
  query GetMetaIdAggregatesPaginated($limit: Int!, $offset: Int!) {
    metaIdAggregates(
      first: $limit
      skip: $offset
      orderBy: totalPower
      orderDirection: desc
    ) {
      id
      totalPower
      reporterCount
    }
  }
`

/**
 * Get meta ID aggregate by ID
 */
export const GET_META_ID_AGGREGATE_BY_ID = gql`
  query GetMetaIdAggregateById($metaId: String!) {
    metaIdAggregates(where: { id_eq: $metaId }, first: 1) {
      id
      totalPower
      reporterCount
    }
  }
`

/**
 * Get meta ID aggregates by total power range
 */
export const GET_META_ID_AGGREGATES_BY_POWER_RANGE = gql`
  query GetMetaIdAggregatesByPowerRange($minPower: BigInt!, $maxPower: BigInt!, $limit: Int!, $offset: Int!) {
    metaIdAggregates(
      where: {
        and: [
          { totalPower_gte: $minPower }
          { totalPower_lte: $maxPower }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: totalPower
      orderDirection: desc
    ) {
      id
      totalPower
      reporterCount
    }
  }
`

/**
 * Get meta ID aggregates by reporter count range
 */
export const GET_META_ID_AGGREGATES_BY_REPORTER_COUNT = gql`
  query GetMetaIdAggregatesByReporterCount($minCount: Int!, $maxCount: Int!, $limit: Int!, $offset: Int!) {
    metaIdAggregates(
      where: {
        and: [
          { reporterCount_gte: $minCount }
          { reporterCount_lte: $maxCount }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: totalPower
      orderDirection: desc
    ) {
      id
      totalPower
      reporterCount
    }
  }
`

/**
 * Get meta ID aggregate count for statistics
 */
export const GET_META_ID_AGGREGATE_COUNT = gql`
  query GetMetaIdAggregateCount {
    metaIdAggregatesConnection {
      totalCount
    }
  }
`

// ============================================================================
// COMBINED ORACLE QUERIES
// ============================================================================

/**
 * Get oracle data for a specific query ID (aggregate reports + micro reports)
 */
export const GET_ORACLE_DATA_BY_QUERY_ID = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query GetOracleDataByQueryId($queryId: String!, $limit: Int!, $offset: Int!) {
    aggregateReports(
      where: { queryId_eq: $queryId }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...AggregateReportFields
    }
    microReports(
      where: { queryId_eq: $queryId }
      first: $limit
      skip: $offset
      orderBy: height
      orderDirection: desc
    ) {
      id
      queryId
      queryIdHeight
      metaId
      height
      reporter
      power
      cycleList
    }
  }
`

/**
 * Get oracle activity by reporter address
 */
export const GET_ORACLE_ACTIVITY_BY_REPORTER = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query GetOracleActivityByReporter($reporter: String!, $limit: Int!, $offset: Int!) {
    microReports(
      where: { reporter_eq: $reporter }
      first: $limit
      skip: $offset
      orderBy: height
      orderDirection: desc
    ) {
      id
      queryId
      queryIdHeight
      metaId
      height
      reporter
      power
      cycleList
    }
  }
`

/**
 * Search oracle data
 */
export const SEARCH_ORACLE_DATA = gql`
  ${AGGREGATE_REPORT_FIELDS}
  query SearchOracleData($searchTerm: String!, $limit: Int!, $offset: Int!) {
    aggregateReports(
      where: {
        or: [
          { queryId_containsInsensitive: $searchTerm }
          { value_containsInsensitive: $searchTerm }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...AggregateReportFields
    }
    microReports(
      where: {
        or: [
          { queryId_containsInsensitive: $searchTerm }
          { reporter_containsInsensitive: $searchTerm }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: height
      orderDirection: desc
    ) {
      id
      queryId
      queryIdHeight
      metaId
      height
      reporter
      power
      cycleList
    }
  }
`
