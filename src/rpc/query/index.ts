import {
  Account,
  Block,
  Coin,
  IndexedTx,
  StargateClient,
} from '@cosmjs/stargate'
import { Tendermint37Client, TxSearchResponse } from '@cosmjs/tendermint-rpc'
import axios from 'axios'
import { rpcManager } from '../../utils/rpcManager'

export async function getChainId(
  tmClient: Tendermint37Client
): Promise<string> {
  const client = await StargateClient.create(tmClient)
  return client.getChainId()
}

export async function getBlock(
  tmClient: Tendermint37Client,
  height: number
): Promise<Block> {
  const client = await StargateClient.create(tmClient)
  return client.getBlock(height)
}

export async function getTx(
  tmClient: Tendermint37Client,
  hash: string
): Promise<IndexedTx | null> {
  const client = await StargateClient.create(tmClient)
  return client.getTx(hash)
}

export async function getAccount(
  tmClient: Tendermint37Client,
  address: string
): Promise<Account | null> {
  const client = await StargateClient.create(tmClient)
  return client.getAccount(address)
}

export async function getAllBalances(
  tmClient: Tendermint37Client,
  address: string
): Promise<readonly Coin[]> {
  const client = await StargateClient.create(tmClient)
  return client.getAllBalances(address)
}

export async function getBalanceStaked(
  tmClient: Tendermint37Client,
  address: string
): Promise<Coin | null> {
  const client = await StargateClient.create(tmClient)
  return client.getBalanceStaked(address)
}

export async function getTxsBySender(
  tmClient: Tendermint37Client,
  address: string,
  page: number,
  perPage: number
): Promise<TxSearchResponse> {
  return tmClient.txSearch({
    query: `message.sender='${address}'`,
    prove: true,
    order_by: 'desc',
    page: page,
    per_page: perPage,
  })
}

const convertToDisplayAmount = (amount: string): string => {
  try {
    // Simply divide by 1 million
    const numberAmount = Number(amount) / 1_000_000
    return numberAmount.toString()
  } catch (error) {
    return '0'
  }
}

export const getAllowedAmounts = async (): Promise<{
  staking_amount?: string
  unstaking_amount?: string
}> => {
  try {
    const response = await axios.get('/api/allowed-amounts')
    return {
      staking_amount: convertToDisplayAmount(response.data.staking_amount),
      unstaking_amount: convertToDisplayAmount(response.data.unstaking_amount),
    }
  } catch (error) {
    return {}
  }
}

export const getAllowedStakingAmount = async (endpoint: string) => {
  try {
    const response = await axios.get('/api/staking-amount', {
      params: { endpoint },
    })
    return convertToDisplayAmount(response.data.amount)
  } catch (error) {
    console.error('Error in getAllowedStakingAmount:', error)
    return undefined
  }
}

export const getAllowedUnstakingAmount = async (endpoint: string) => {
  try {
    const response = await axios.get('/api/unstaking-amount', {
      params: { endpoint },
    })
    return convertToDisplayAmount(response.data.amount)
  } catch (error) {
    console.error('Error in getAllowedUnstakingAmount:', error)
    return undefined
  }
}

export const getAllowedAmountExp = async (): Promise<string | undefined> => {
  try {
    const response = await axios.get('/api/allowed-amount-exp')
    if (response.data?.expiration) {
      // Don't multiply by 1000 since it's already in milliseconds
      const timestamp = Number(response.data.expiration)
      const date = new Date(timestamp)

      return date.toLocaleString() // Will show something like "11/29/2024, 3:30:45 PM"
    }
    return undefined
  } catch (error) {
    return undefined
  }
}

export const getReporterCount = async (
  queryId: string,
  timestamp: string
): Promise<{
  count: number
  queryType: string
  aggregateMethod: string
  cycleList: boolean
  totalPower: number
} | null> => {
  try {
    // Get the current endpoint from the RPC manager
    const currentEndpoint = await rpcManager.getCurrentEndpoint()

    const response = await axios.get('/api/reporter-count', {
      params: { queryId, timestamp, endpoint: currentEndpoint },
    })
    return response.data
  } catch (error) {
    console.error('Error in getReporterCount:', error)
    return null
  }
}

export const getReporterList = async (): Promise<string[] | undefined> => {
  const url = `${process.env.NEXT_PUBLIC_RPC_ENDPOINT}/tellor-io/layer/reporter/reporters`
  try {
    const response = await axios.get(url)
    if (response.data && Array.isArray(response.data.reporters)) {
      return response.data.reporters
    } else {
      return undefined
    }
  } catch (error) {
    return undefined
  }
}

export const getReporterSelectors = async (
  reporter: string,
  rpcAddress?: string
): Promise<number | undefined> => {
  try {
    const params = new URLSearchParams({
      t: Date.now().toString(),
    })
    if (rpcAddress) {
      params.append('rpc', rpcAddress)
    }

    const response = await axios.get(
      `/api/reporter-selectors/${reporter}?${params.toString()}`,
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
    if (response.data && typeof response.data.num_of_selectors === 'number') {
      return response.data.num_of_selectors
    } else {
      return undefined
    }
  } catch (error) {
    return undefined
  }
}

export const getAllReportersWithSelectors = async (): Promise<
  Array<{ reporter: string; selectors: number | undefined }> | undefined
> => {
  const reporters = await getReporterList()
  if (!reporters) return undefined

  const reportersWithSelectors = await Promise.all(
    reporters.map(async (reporter) => ({
      reporter,
      selectors: await getReporterSelectors(reporter),
    }))
  )

  return reportersWithSelectors
}

export const getBlockResults = async (height: number): Promise<any> => {
  try {
    const endpoint = await rpcManager.getCurrentEndpoint()
    const url = `${endpoint}/block_results?height=${height}`
    const response = await axios.get(url)
    return response.data.result
  } catch (error) {
    return undefined
  }
}

export const getValidatorMoniker = async (address: string): Promise<string> => {
  try {
    const endpoint = await rpcManager.getCurrentEndpoint()
    const url = `${endpoint}/validators/${address}`
    const response = await axios.get(url)
    return response.data.validator.description.moniker
  } catch (error) {
    return 'Unknown'
  }
}

/*export async function getAverageGasCost(): Promise<number | undefined> {
  console.log('Fetching average gas cost...');
  try {
    // Replace this URL with your actual API endpoint
    const response = await fetch('YOUR_BLOCKCHAIN_API_ENDPOINT/average-gas-cost');
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Received data:', data);
    
    if (data.averageGasCost === undefined) {
      console.log('averageGasCost is undefined in the response');
      return undefined;
    }
    
    return data.averageGasCost;
  } catch (error) {
    console.error('Error in getAverageGasCost:', error);
    return undefined;
  } finally {
    console.log('getAverageGasCost function completed');
  }
}*/

export const getCurrentCycleList = async (endpoint: string) => {
  try {
    const response = await axios.get('/api/current-cycle', {
      params: { endpoint },
    })
    return response.data.cycleList
  } catch (error) {
    console.error('Error in getCurrentCycleList:', error)
    return undefined
  }
}

interface QueryTypeConfig {
  name: string
  params: string[]
  encode: (...args: any[]) => {
    matched: boolean
    base?: string
    quote?: string
  }
}

export function decodeQueryData(queryId: string, queryData?: string): any {
  try {
    // If we have queryData, try to decode that first
    if (queryData) {
      try {
        // Convert hex to ASCII if it's hex encoded
        const asciiData = queryData.startsWith('0x')
          ? Buffer.from(queryData.slice(2), 'hex').toString('ascii')
          : Buffer.from(queryData, 'hex').toString('ascii')

        // Look for known patterns
        if (asciiData.includes('SpotPrice')) {
          const matches = asciiData.match(/[A-Za-z]{3,}/g)
          if (matches && matches.length >= 3) {
            const [_, base, quote] = matches
            return {
              queryType: 'SpotPrice',
              decodedValue: `SpotPrice: ${base}/${quote}`,
            }
          }
        }

        return {
          queryType: 'Unknown',
          decodedValue: `Raw: ${asciiData}`,
        }
      } catch (error) {
        // Silent fail and return default response
      }
    }

    // Fallback to returning the query ID if we can't decode
    return {
      queryType: 'Unknown',
      decodedValue: 'Query data not available',
    }
  } catch (error) {
    return {
      queryType: 'Unknown',
      decodedValue: 'Decode error',
    }
  }
}

export const getValidators = async (endpoint: string): Promise<any> => {
  try {
    const response = await axios.get(`${endpoint}/validators`)

    const data = response.data

    return data
  } catch (error) {
    console.error('Failed to fetch validators:', error)
    throw error
  }
}

export async function getTotalReporterCount(): Promise<number> {
  try {
    // First try to get reporters list
    const response = await fetch('/api/reporters')
    const data = await response.json()

    if (data && Array.isArray(data.reporters)) {
      return data.reporters.length
    }

    // Fallback to reporter-selectors count if reporters list fails
    const countResponse = await fetch('/api/reporter-selectors/count')
    const countData = await countResponse.json()
    return countData.count || 0
  } catch (error) {
    console.error('Error fetching total reporter count:', error)
    return 0
  }
}

export const getLatestBlock = async (endpoint: string) => {
  try {
    const response = await axios.get(`${endpoint}/block`)
    return response.data
  } catch (error) {
    return undefined
  }
}

export const getEvmValidators = async (endpoint: string) => {
  try {
    const response = await axios.get(`${endpoint}/tellor-io/layer/evm/validators`)
    return response.data
  } catch (error) {
    return undefined
  }
}

export const getReporters = async (endpoint: string) => {
  try {
    const response = await axios.get(`${endpoint}/tellor-io/layer/reporter/reporters`)
    return response.data
  } catch (error) {
    console.error('Error in getReporters:', error)
    return undefined
  }
}

export const getSupplyByDenom = async (endpoint: string, denom: string) => {
  try {
    const baseEndpoint = endpoint.replace('/rpc', '')
    const response = await axios.get(
      `${baseEndpoint}/cosmos/bank/v1beta1/supply/by_denom?denom=${denom}`
    )
    return response.data.amount
  } catch (error) {
    console.error('Error in getSupplyByDenom:', error)
    return undefined
  }
}
