/**
 * HYBRID ARCHITECTURE - GraphQL Client
 * 
 * This client handles all GraphQL queries for standard Cosmos data in the hybrid architecture.
 * 
 * Data Sources Handled:
 * - Blocks: Latest blocks, block details, proposer information
 * - Validators: Validator lists, bonding status, commission rates
 * - Proposals: Governance proposals, voting status, timestamps
 * - Delegations: Validator delegations, delegator counts
 * - Reporters: Basic reporter information (when available)
 * 
 * Authentication:
 * - Uses basic auth with admin credentials
 * - Endpoint: https://testnet.sagemode.io/
 * 
 * Error Handling:
 * - Network failures with retry logic
 * - GraphQL errors with detailed messages
 * - TypeScript generics for type safety
 * 
 * This client works alongside RPC endpoints for Tellor-specific data,
 * creating a hybrid architecture that optimizes performance and data availability.
 */

const GRAPHQL_ENDPOINT = 'https://testnet.sagemode.io/';
const GRAPHQL_USERNAME = 'admin';
const GRAPHQL_PASSWORD = 'superbowl-champions';

export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
}

/**
 * Execute a GraphQL query against the indexer with retry logic and timeout
 * 
 * @param query - GraphQL query string
 * @param variables - Optional variables for the query
 * @param retries - Number of retry attempts (default: 3)
 * @param timeout - Request timeout in milliseconds (default: 15000)
 * @returns Promise resolving to the typed response data
 * @throws Error if the request fails or GraphQL returns errors
 */
export async function graphqlQuery<T = any>(
  query: string,
  variables?: Record<string, any>,
  retries: number = 3,
  timeout: number = 15000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const requestBody: GraphQLRequest = {
        query,
        ...(variables && { variables })
      };

      // Create basic auth header (works in both browser and Node.js)
      const credentials = typeof btoa !== 'undefined' 
        ? btoa(`${GRAPHQL_USERNAME}:${GRAPHQL_PASSWORD}`)
        : Buffer.from(`${GRAPHQL_USERNAME}:${GRAPHQL_PASSWORD}`).toString('base64');
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
        credentials: 'omit', // Don't send cookies
        mode: 'cors', // Explicitly set CORS mode
        cache: 'no-store', // Prevent browser caching (fetch API option, not a header)
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error(`GraphQL request failed:`, {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result: GraphQLResponse<T> = await response.json();

      // Check for GraphQL errors
      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map(error => error.message).join(', ');
        throw new Error(`GraphQL errors: ${errorMessages}`);
      }

      // Check if data is present
      if (!result.data) {
        throw new Error('No data returned from GraphQL query');
      }

      return result.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Log the error for debugging
      console.error(`GraphQL query attempt ${attempt + 1} failed:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.substring(0, 100) + '...',
        variables
      });
      
      // Don't retry on certain errors
      if (error instanceof Error && (
        error.message.includes('GraphQL errors:') ||
        error.message.includes('No data returned') ||
        error.message.includes('HTTP 4')
      )) {
        throw error;
      }

      // If this is the last attempt, throw the error
      if (attempt === retries) {
        break;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      console.warn(`GraphQL query attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Enhanced error handling with context
  throw new Error(`GraphQL query failed after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Execute multiple GraphQL queries in parallel with retry logic
 * 
 * @param queries - Array of query objects with query string and optional variables
 * @param retries - Number of retry attempts (default: 3)
 * @param timeout - Request timeout in milliseconds (default: 15000)
 * @returns Promise resolving to array of typed response data
 */
export async function graphqlBatchQuery<T = any>(
  queries: Array<{ query: string; variables?: Record<string, any> }>,
  retries: number = 3,
  timeout: number = 15000
): Promise<T[]> {
  const promises = queries.map(({ query, variables }) => 
    graphqlQuery<T>(query, variables, retries, timeout)
  );
  
  return Promise.all(promises);
}

/**
 * Convert comma-separated byte string to hex string
 * GraphQL stores hashes as comma-separated byte strings: "65,41,65,23,48,191,116..."
 * 
 * @param byteString - Comma-separated byte string
 * @returns Hex string representation
 */
export function bytesToHex(byteString: string): string {
  try {
    const bytes = byteString.split(',').map(byte => parseInt(byte.trim(), 10));
    return Buffer.from(bytes).toString('hex');
  } catch (error) {
    console.warn('Failed to convert byte string to hex:', byteString);
    return byteString; // Return original if conversion fails
  }
}

/**
 * Parse JSON string field safely
 * 
 * @param jsonString - JSON string to parse
 * @returns Parsed object or null if parsing fails
 */
export function parseJsonField<T = any>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON field:', jsonString);
    return null;
  }
}
