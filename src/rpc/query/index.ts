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

export async function getChainId(
  tmClient: Tendermint37Client
): Promise<string> {
  const client = await StargateClient.create(tmClient)
  return client.getChainId()
}

export async function getValidators(
  tmClient: Tendermint37Client
): Promise<ValidatorsResponse> {
  return tmClient.validatorsAll()
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

export const getAllowedUnstakingAmount = async (): Promise<
  number | undefined
> => {
  const url = 'https://tellorlayer.com/tellor-io/layer/reporter/allowed-amount'
  try {
    const response = await axios.get(url)
    const unstaking_amount =
      Math.abs(response.data.unstaking_amount) / 1_000_000 // Get absolute value and move decimal left by 6
    return unstaking_amount
  } catch (error) {
    console.error('Error fetching allowed unstaking amount:', error)
    return undefined
  }
}

export const getAllowedStakingAmount = async (): Promise<
  number | undefined
> => {
  const url = 'https://tellorlayer.com/tellor-io/layer/reporter/allowed-amount'
  try {
    const response = await axios.get(url)
    const staking_amount = Math.abs(response.data.staking_amount) / 1_000_000 // Get absolute value and move decimal left by 6
    return staking_amount
  } catch (error) {
    console.error('Error fetching allowed staking amount:', error)
    return undefined
  }
}

export const getAllowedAmountExp = async (): Promise<number | undefined> => {
  const url =
    'https://tellorlayer.com/tellor-io/layer/reporter/allowed-amount-expiration'
  try {
    const response = await axios.get(url)
    const allowed_amount_exp = Math.abs(response.data.expiration)

    // Return the timestamp as a number
    return allowed_amount_exp
  } catch (error) {
    console.error('Error fetching allowed amount expiration:', error)
    return undefined
  }
}

export const getReporterCount = async (): Promise<number | undefined> => {
  const url = 'https://tellorlayer.com/tellor-io/layer/reporter/reporters'
  try {
    const response = await axios.get(url)
    console.log('Response headers:', response.headers)
    console.log('Response data:', response.data)

    if (response.data && Array.isArray(response.data.reporters)) {
      return response.data.reporters.length
    } else {
      console.error('Unexpected response structure:', response.data)
      return undefined
    }
  } catch (error) {
    console.error('Error fetching reporter count:', error)
    return undefined
  }
}

export const getReporterList = async (): Promise<string[] | undefined> => {
  const url = 'https://tellorlayer.com/tellor-io/layer/reporter/reporters'
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
  const url = `https://tellorlayer.com/tellor-io/layer/reporter/num-of-selectors-by-reporter/${reporter}`
  try {
    const response = await axios.get(url)
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

export const getCurrentCycleList = async (): Promise<any[]> => {
  const url =
    'https://tellorlayer.com/tellor-io/layer/oracle/current_cyclelist_query'
  try {
    console.log('Fetching current cycle list from:', url)
    const response = await axios.get(url)
    console.log('Response data:', response.data)

    if (response.data && response.data.query_data) {
      // If query_data is a string, wrap it in an array
      const queryDataArray = Array.isArray(response.data.query_data)
        ? response.data.query_data
        : [response.data.query_data]

      return queryDataArray.map(decodeQueryData)
    } else {
      console.log('No query_data found in response')
      return []
    }
  } catch (error) {
    console.error('Error fetching current cycle list:', error)
    return []
  }
}

function decodeQueryData(queryData: string): any {
  try {
    console.log('Attempting to decode:', queryData)

    // Convert hex to ASCII
    const asciiData = Buffer.from(queryData, 'hex').toString('ascii')
    console.log('ASCII data:', asciiData)

    // Find the query type
    const spotPriceIndex = asciiData.indexOf('SpotPrice')
    if (spotPriceIndex !== -1) {
      const queryType = 'SpotPrice'

      // Extract only the last two 3-letter words
      const words = asciiData.match(/[a-z]{3}/g)
      const queryParams = words ? words.slice(-2) : []

      console.log('Successfully decoded:', { queryType, queryParams })
      return { queryType, queryParams }
    }

    throw new Error('Unable to parse query data')
  } catch (error) {
    console.error('Error decoding query data:', error)
    return { queryType: 'Unknown', queryParams: [] }
  }
}
