export const HARDCODED_RPC_ADDRESS = 'https://rpc.layer-node.com'
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
  'https://rpc.layer-node.com', // primary URL
  'https://tellorlayer.com', // fallback URL
]
