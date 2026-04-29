export const formatRPCEndpoint = (
  endpoint: string,
  includeRPC: boolean = true
) => {
  const baseEndpoint = endpoint.replace('/rpc', '')
  return includeRPC ? `${baseEndpoint}/rpc` : baseEndpoint
}

export const LS_RPC_ADDRESS = 'RPC_ADDRESS'
export const LS_ACTIVE_NETWORK = 'ACTIVE_NETWORK'

export type LayerNetwork = 'mainnet' | 'palmito'

const NETWORKS: LayerNetwork[] = ['mainnet', 'palmito']
const DEFAULT_NETWORK: LayerNetwork = 'mainnet'

const normalizeEndpoint = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  return trimmed.replace(/\/+$/, '')
}

const parseCsvList = (value: string | undefined): string[] => {
  if (!value) return []
  return value
    .split(',')
    .map((item) => normalizeEndpoint(item))
    .filter(Boolean)
}

const DEFAULT_RPC_ENDPOINTS: Record<LayerNetwork, string[]> = {
  mainnet: ['https://mainnet.tellorlayer.com/rpc'],
  palmito: ['https://node-palmito.tellorlayer.com/rpc'],
}

const DEFAULT_GRAPHQL_ENDPOINTS: Record<LayerNetwork, string[]> = {
  mainnet: [],
  palmito: ['https://testnet.sagemode.io/'],
}

const mainnetRpcFromEnv = parseCsvList(
  process.env.NEXT_PUBLIC_MAINNET_RPC_ENDPOINTS ?? process.env.MAINNET_RPC_ENDPOINTS
)
const palmitoRpcFromEnv = parseCsvList(
  process.env.NEXT_PUBLIC_PALMITO_RPC_ENDPOINTS ?? process.env.PALMITO_RPC_ENDPOINTS
)
const mainnetGraphqlFromEnv = parseCsvList(
  process.env.NEXT_PUBLIC_MAINNET_GRAPHQL_ENDPOINTS ??
    process.env.MAINNET_GRAPHQL_ENDPOINTS
)
const palmitoGraphqlFromEnv = parseCsvList(
  process.env.NEXT_PUBLIC_PALMITO_GRAPHQL_ENDPOINTS ??
    process.env.PALMITO_GRAPHQL_ENDPOINTS
)

export const NETWORK_RPC_ENDPOINTS: Record<LayerNetwork, string[]> = {
  mainnet:
    mainnetRpcFromEnv.length > 0
      ? mainnetRpcFromEnv
      : DEFAULT_RPC_ENDPOINTS.mainnet,
  palmito:
    palmitoRpcFromEnv.length > 0
      ? palmitoRpcFromEnv
      : DEFAULT_RPC_ENDPOINTS.palmito,
}

export const NETWORK_GRAPHQL_ENDPOINTS: Record<LayerNetwork, string[]> = {
  mainnet:
    mainnetGraphqlFromEnv.length > 0
      ? mainnetGraphqlFromEnv
      : DEFAULT_GRAPHQL_ENDPOINTS.mainnet,
  palmito:
    palmitoGraphqlFromEnv.length > 0
      ? palmitoGraphqlFromEnv
      : DEFAULT_GRAPHQL_ENDPOINTS.palmito,
}

// Keep backward compatibility for code that still imports RPC_ENDPOINTS directly.
export const RPC_ENDPOINTS = NETWORK_RPC_ENDPOINTS[DEFAULT_NETWORK]

export const getDefaultNetwork = (): LayerNetwork => DEFAULT_NETWORK

export const normalizeNetwork = (
  network: string | undefined | null
): LayerNetwork => {
  if (!network) return DEFAULT_NETWORK
  return NETWORKS.includes(network as LayerNetwork)
    ? (network as LayerNetwork)
    : DEFAULT_NETWORK
}

export const getNetworkLabel = (network: LayerNetwork): string =>
  network === 'mainnet' ? 'Mainnet' : 'Palmito Testnet'

export const getRpcEndpointsForNetwork = (network: LayerNetwork): string[] => {
  const configured = NETWORK_RPC_ENDPOINTS[network]
  if (configured.length > 0) return configured
  return DEFAULT_RPC_ENDPOINTS[network]
}

export const getGraphqlEndpointsForNetwork = (
  network: LayerNetwork
): string[] => {
  const configured = NETWORK_GRAPHQL_ENDPOINTS[network]
  if (configured.length > 0) return configured
  return DEFAULT_GRAPHQL_ENDPOINTS[network]
}

export const getGraphqlAuthForNetwork = (network: LayerNetwork) => {
  const isMainnet = network === 'mainnet'
  return {
    username: isMainnet
      ? process.env.NEXT_PUBLIC_MAINNET_GRAPHQL_USERNAME ||
        process.env.MAINNET_GRAPHQL_USERNAME ||
        ''
      : process.env.NEXT_PUBLIC_PALMITO_GRAPHQL_USERNAME ||
        process.env.PALMITO_GRAPHQL_USERNAME ||
        '',
    password: isMainnet
      ? process.env.NEXT_PUBLIC_MAINNET_GRAPHQL_PASSWORD ||
        process.env.MAINNET_GRAPHQL_PASSWORD ||
        ''
      : process.env.NEXT_PUBLIC_PALMITO_GRAPHQL_PASSWORD ||
        process.env.PALMITO_GRAPHQL_PASSWORD ||
        '',
  }
}
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
