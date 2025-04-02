export const formatRPCEndpoint = (endpoint: string, includeRPC: boolean = true) => {
  const baseEndpoint = endpoint.replace('/rpc', '')
  return includeRPC ? `${baseEndpoint}/rpc` : baseEndpoint
}

export const HARDCODED_RPC_ADDRESS = 'node-palmito.tellorlayer.com/rpc'
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
  'https://node-palmito.tellorlayer.com/rpc', // primary URL
  'https://tellor-testnet.nirvanalabs.xyz/tellor-testnet-amer/9c6ef4f75548392504e9451539c7603446c5/', // fallback URL
]