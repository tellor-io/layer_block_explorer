import {
  Account,
  Block,
  Coin,
  IndexedTx,
  StargateClient,
} from '@cosmjs/stargate'
import {
  Tendermint37Client,
  TxSearchResponse,
  ValidatorsResponse,
} from '@cosmjs/tendermint-rpc'
import axios from 'axios'
import { ethers } from 'ethers'
import { keccak256 } from '@ethersproject/keccak256'
import { defaultAbiCoder } from '@ethersproject/abi'

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
    console.error('Error converting amount:', error)
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
    console.error('Error in getAllowedAmounts:', error)
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
    console.error('Error in getAllowedStakingAmount:', error)
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
    console.error('Error in getAllowedAmountExp:', error)
    return undefined
  }
}

export const getReporterCount = async (
  queryId?: string,
  timestamp?: string
): Promise<number> => {
  try {
    // If no parameters provided, get total reporter count
    if (!queryId || !timestamp) {
      const response = await axios.get('/api/reporters')
      if (response.data && Array.isArray(response.data.reporters)) {
        return response.data.reporters.length
      }
      return 0
    }

    // Otherwise, get reporter count for specific query/timestamp
    const response = await axios.get(`/api/reporter-count`, {
      params: {
        queryId,
        timestamp,
      },
    })

    if (typeof response.data.count !== 'number') {
      return 0
    }

    return response.data.count
  } catch (error) {
    console.error('Error in getReporterCount:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      response:
        error instanceof Error && 'response' in error
          ? error.response
          : undefined,
    })
    return 0
  }
}

export const getReporterList = async (): Promise<string[] | undefined> => {
  const url = `${process.env.NEXT_PUBLIC_RPC_ENDPOINT}/tellor-io/layer/reporter/reporters`
  try {
    const response = await axios.get(url)
    if (response.data && Array.isArray(response.data.reporters)) {
      return response.data.reporters
    } else {
      console.error('Unexpected response structure:', response.data)
      return undefined
    }
  } catch (error) {
    console.error('Error fetching reporter list:', error)
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
      console.error('Unexpected response structure:', response.data)
      return undefined
    }
  } catch (error) {
    console.error('Error fetching reporter selectors:', error)
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
    console.error('Error fetching block results:', error)
    return undefined
  }
}

export const getValidatorMoniker = async (address: string): Promise<string> => {
  const url = `https://tellorlayer.com/cosmos/staking/v1beta1/validators/${address}`
  try {
    const response = await axios.get(url)
    return response.data.validator.description.moniker
  } catch (error) {
    console.error('Error fetching validator moniker:', error)
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

    console.error('Client: Invalid response structure:', response.data)
    return []
  } catch (error) {
    console.error('Client: Error fetching current cycle list:', error)
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
    console.log('Decoding with:', { queryId, queryData })

    // If we have queryData, try to decode that first
    if (queryData) {
      try {
        // Convert hex to ASCII if it's hex encoded
        const asciiData = queryData.startsWith('0x')
          ? Buffer.from(queryData.slice(2), 'hex').toString('ascii')
          : Buffer.from(queryData, 'hex').toString('ascii')

        console.log('Decoded ASCII:', asciiData)

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
        console.error('Error decoding query data:', error)
      }
    }

    // Fallback to returning the query ID if we can't decode
    return {
      queryType: 'Unknown',
      decodedValue: 'Query data not available',
    }
  } catch (error) {
    console.error('Error in decodeQueryData:', error)
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
    console.error('Error fetching validators:', error)
    return undefined
  }
}
