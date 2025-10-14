export const formatRPCEndpoint = (
  endpoint: string,
  includeRPC: boolean = true
) => {
  const baseEndpoint = endpoint.replace('/rpc', '')
  return includeRPC ? `${baseEndpoint}/rpc` : baseEndpoint
}

export const LS_RPC_ADDRESS = 'RPC_ADDRESS'
export const GOV_PARAMS_TYPE = {
  VOTING: 'voting',
  DEPOSIT: 'deposit',
  TALLY: 'tallying',
}

export type proposalStatus = {
  id: number
  status: string
  color: string
}
export const proposalStatusList: proposalStatus[] = [
  {
    id: 0,
    status: 'UNSPECIFIED',
    color: 'gray',
  },
  {
    id: 1,
    status: 'DEPOSIT PERIOD',
    color: 'blue',
  },
  {
    id: 2,
    status: 'VOTING PERIOD',
    color: 'blue',
  },
  {
    id: 3,
    status: 'PASSED',
    color: 'green',
  },
  {
    id: 4,
    status: 'REJECTED',
    color: 'red',
  },
  {
    id: 5,
    status: 'FAILED',
    color: 'red',
  },
]

export const RPC_ENDPOINTS = [
  'https://mainnet.tellorlayer.com/rpc', // primary URL
  'https://node-palmito.tellorlayer.com/rpc', // fallback URL
]

export const GRAPHQL_ENDPOINTS = [
  'https://indexer.tellorlayer.com/graphql', // primary GraphQL URL
  'https://backup-indexer.tellorlayer.com/graphql', // fallback GraphQL URL
]

export const DATA_SOURCE_CONFIG = {
  PRIMARY: 'graphql',
  FALLBACK: 'rpc',
  AUTO_FALLBACK: true,
  HEALTH_CHECK_INTERVAL: 30000,
  GRAPHQL_TIMEOUT: 10000,
  GRAPHQL_MAX_RETRIES: 3,
}
