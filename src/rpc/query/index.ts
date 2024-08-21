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
