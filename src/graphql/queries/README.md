# GraphQL Queries Documentation

This directory contains all GraphQL queries for the Layer Block Explorer, organized by data type and optimized for performance and maintainability.

## Directory Structure

```
src/graphql/queries/
├── fragments.ts          # Reusable GraphQL fragments
├── blocks.ts            # Block-related queries
├── transactions.ts      # Transaction-related queries
├── validators.ts        # Validator-related queries
├── reporters.ts         # Reporter-related queries
├── bridge.ts           # Bridge deposits and withdrawals
├── oracle.ts           # Oracle reports and data
├── index.ts            # Main export file
└── README.md           # This documentation
```

## Usage Patterns

### 1. Importing Queries

```typescript
// Import specific queries
import { GET_LATEST_BLOCK, GET_BLOCKS } from '@/graphql/queries/blocks'
import { GET_VALIDATORS } from '@/graphql/queries/validators'

// Import query groups
import { Queries } from '@/graphql/queries'
const { GET_LATEST_BLOCK } = Queries.blocks

// Import common queries
import { CommonQueries } from '@/graphql/queries'
const { GET_LATEST_BLOCK } = CommonQueries
```

### 2. Using Fragments

Fragments are defined in `fragments.ts` and provide reusable field selections:

```typescript
import {
  BLOCK_FIELDS,
  VALIDATOR_BASIC_FIELDS,
} from '@/graphql/queries/fragments'

// Fragments are automatically included in queries
const query = gql`
  ${BLOCK_FIELDS}
  query GetBlock($height: BigInt!) {
    block(blockHeight: $height) {
      ...BlockFields
    }
  }
`
```

### 3. Query Optimization

All queries include:

- **Pagination**: `limit` and `offset` parameters
- **Sorting**: `orderBy` and `orderDirection` parameters
- **Filtering**: `where` clauses for specific conditions
- **Performance**: Optimized field selection using fragments

## Query Categories

### Blocks (`blocks.ts`)

- Latest block retrieval
- Block by height/hash
- Paginated block lists
- Block statistics
- Time range queries
- Search functionality

### Transactions (`transactions.ts`)

- Transaction by hash
- Paginated transaction lists
- Transactions by block
- Time range queries
- Address-based queries
- Search functionality

### Validators (`validators.ts`)

- All validators
- Validator by address
- Active/jailed validators
- Delegation queries
- Commission rate filtering
- Search by moniker/identity

### Reporters (`reporters.ts`)

- All reporters
- Reporter by address
- Active/jailed reporters
- Selector queries
- Commission rate filtering
- Search functionality

### Bridge (`bridge.ts`)

- Bridge deposits
- Withdrawals
- Status-based filtering (reported/claimed)
- Amount and time range queries
- Address-based activity

### Oracle (`oracle.ts`)

- Aggregate reports
- Micro reports
- Meta ID aggregates
- Query ID filtering
- Flagged/cyclist reports
- Reporter activity

## Best Practices

### 1. Fragment Usage

- Always use fragments for field selection
- Create basic and full field variants
- Keep fragments focused and reusable

### 2. Pagination

- Always include pagination parameters
- Use consistent ordering (usually DESC by timestamp/height)
- Provide both basic and full detail variants

### 3. Filtering

- Use specific `where` clauses for performance
- Support multiple filter combinations
- Include search functionality where appropriate

### 4. Performance

- Limit field selection to what's needed
- Use indexed fields in `where` clauses
- Avoid deep nesting in queries

### 5. Error Handling

- Queries are designed to work with the existing error boundaries
- Use the `GraphQLResponse<T>` type for type safety
- Handle empty results gracefully

## Query Patterns

### Basic Query Pattern

```typescript
export const GET_ENTITY = gql`
  ${ENTITY_FIELDS}
  query GetEntity($id: String!) {
    entity(id: $id) {
      ...EntityFields
    }
  }
`
```

### Paginated Query Pattern

```typescript
export const GET_ENTITIES = gql`
  ${ENTITY_FIELDS}
  query GetEntities($limit: Int!, $offset: Int!) {
    entities(
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...EntityFields
    }
  }
`
```

### Filtered Query Pattern

```typescript
export const GET_ENTITIES_BY_STATUS = gql`
  ${ENTITY_FIELDS}
  query GetEntitiesByStatus($status: String!, $limit: Int!, $offset: Int!) {
    entities(
      where: { status_eq: $status }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...EntityFields
    }
  }
`
```

### Search Query Pattern

```typescript
export const SEARCH_ENTITIES = gql`
  ${ENTITY_FIELDS}
  query SearchEntities($searchTerm: String!, $limit: Int!, $offset: Int!) {
    entities(
      where: {
        or: [
          { field1_containsInsensitive: $searchTerm }
          { field2_containsInsensitive: $searchTerm }
        ]
      }
      first: $limit
      skip: $offset
      orderBy: timestamp
      orderDirection: desc
    ) {
      ...EntityFields
    }
  }
`
```

## Integration with Data Source Manager

These queries are designed to work seamlessly with the `DataSourceManager`:

```typescript
import { DataSourceManager } from '@/utils/dataSourceManager'

const dataSourceManager = new DataSourceManager()
const client = await dataSourceManager.getGraphQLClient()

const result = await client.query({
  query: GET_LATEST_BLOCK,
  fetchPolicy: 'network-only',
})
```

## Type Safety

All queries are designed to work with the TypeScript interfaces defined in `src/types/graphql.ts`. The response types ensure type safety throughout the application.

## Performance Considerations

1. **Query Optimization**: Use fragments to minimize field selection
2. **Pagination**: Always implement proper pagination
3. **Caching**: Leverage Apollo Client's caching capabilities
4. **Network Policy**: Use appropriate `fetchPolicy` settings
5. **Error Boundaries**: Implement proper error handling

## Future Enhancements

1. **Subscriptions**: Add real-time data subscriptions
2. **Query Optimization**: Implement query batching and deduplication
3. **Caching Strategy**: Enhance caching policies
4. **Performance Monitoring**: Add query performance tracking
5. **Schema Evolution**: Support for schema changes and migrations
