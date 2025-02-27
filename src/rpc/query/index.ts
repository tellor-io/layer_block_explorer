import {
  Account,
  Block,
  Coin,
  IndexedTx,
  StargateClient,
} from '@cosmjs/stargate'
import { Tendermint37Client, TxSearchResponse } from '@cosmjs/tendermint-rpc'
import axios from 'axios'

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

export const getAllowedStakingAmount = async (): Promise<
  string | undefined
> => {
  try {
    const amounts = await getAllowedAmounts()
    return amounts.staking_amount
  } catch (error) {
    return undefined
  }
}

export const getAllowedUnstakingAmount = async (): Promise<
  string | undefined
> => {
  try {
    const amounts = await getAllowedAmounts()
    return amounts.unstaking_amount
  } catch (error) {
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

export async function getReporterCount(queryId: string, timestamp: string) {
  const maxRetries = 2
  const retryDelay = 2000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        `/api/reporter-count?queryId=${queryId}&timestamp=${timestamp}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data || typeof data.count === 'undefined') {
        console.log('[getReporterCount] Invalid response data structure')
        throw new Error('Invalid response data')
      }

      // Only return if we have valid data
      if (
        data.queryType !== 'N/A' &&
        data.aggregateMethod !== 'N/A' &&
        data.count > 0
      ) {
        return {
          count: data.count,
          queryType: data.queryType,
          aggregateMethod: data.aggregateMethod,
          cycleList: data.cycleList,
          totalPower: data.totalPower,
        }
      }

      console.log('[getReporterCount] Received N/A values, will retry')
      throw new Error('Received N/A values from API')
    } catch (error) {
      console.error(`[getReporterCount] Attempt ${attempt + 1} failed:`, error)
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * (attempt + 1)
        console.log(`[getReporterCount] Waiting ${delay}ms before retry`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
    }
  }

  console.error('[getReporterCount] All retries failed')
  return {
    count: 0,
    queryType: 'N/A',
    aggregateMethod: 'N/A',
    cycleList: false,
    totalPower: 0,
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
  reporter: string
): Promise<number | undefined> => {
  try {
    const response = await axios.get(`/api/reporter-selectors/${reporter}`)
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
  const url = `https://tellorlayer.com/rpc/block_results?height=${height}`
  try {
    const response = await axios.get(url)
    return response.data.result
  } catch (error) {
    return undefined
  }
}

export const getValidatorMoniker = async (address: string): Promise<string> => {
  const url = `https://tellorlayer.com/cosmos/staking/v1beta1/validators/${address}`
  try {
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

export const getCurrentCycleList = async (): Promise<
  Array<{ queryParams: string }>
> => {
  try {
    const response = await axios.get('/api/current-cycle')

    if (response.data && Array.isArray(response.data)) {
      return response.data
    }
    return []
  } catch (error) {
    return []
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

export const getValidators = async () => {
  try {
    const response = await axios.get('/api/validators')
    return response.data
  } catch (error) {
    return undefined
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
