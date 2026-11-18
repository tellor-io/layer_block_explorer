import { ethers } from 'ethers'
import axios from 'axios'
import BRIDGE_ABI from '../abis/bridge.json'

export const BRIDGE_CONTRACT_ADDRESS =
  '0x5acb5977f35b1A91C4fE0F4386eB669E046776F2'

export interface Deposit {
  id: number
  sender: string
  recipient: string
  amount: bigint
  tip: bigint
  blockHeight: bigint
  blockTimestamp?: Date
}

export const getDeposits = async (): Promise<Deposit[]> => {
  const response = await axios.get('/api/ethereum/bridge?method=deposits')
  return response.data.map((deposit: any) => ({
    ...deposit,
    amount: BigInt(deposit.amount),
    tip: BigInt(deposit.tip),
    blockHeight: BigInt(deposit.blockHeight),
    blockTimestamp: deposit.blockTimestamp
      ? new Date(deposit.blockTimestamp)
      : undefined,
  }))
}

export const getDepositId = async (): Promise<number> => {
  const response = await axios.get('/api/ethereum/bridge?method=depositId')
  return Number(response.data.id)
}

export const isWithdrawClaimed = async (id: number): Promise<boolean> => {
  const response = await axios.get(
    `/api/ethereum/bridge?method=withdrawClaimed&id=${id}`
  )
  return response.data.claimed
}

// Query types the chain has used for deposit reports, current one first; older deposits were reported under the earlier type
export const DEPOSIT_QUERY_TYPES = ['TRBBridgeV2', 'TRBBridge'] as const
export type DepositQueryType = (typeof DEPOSIT_QUERY_TYPES)[number]

// Query id of a deposit report, as stored by the indexer: lowercase hex without a 0x prefix
export const generateDepositQueryId = (
  depositId: number,
  queryType: DepositQueryType = DEPOSIT_QUERY_TYPES[0]
): string => {
  const abiCoder = new ethers.AbiCoder()

  const innerData = abiCoder.encode(['bool', 'uint256'], [true, depositId])

  const queryData = abiCoder.encode(['string', 'bytes'], [queryType, innerData])

  const queryId = ethers.keccak256(queryData)
  return queryId.slice(2)
}

export const generateWithdrawalQueryId = (withdrawalId: number): string => {
  const abiCoder = new ethers.AbiCoder()

  const innerData = abiCoder.encode(['bool', 'uint256'], [false, withdrawalId])

  const queryData = abiCoder.encode(
    ['string', 'bytes'],
    ['TRBBridge', innerData]
  )

  const queryId = ethers.keccak256(queryData)
  return queryId.slice(2)
}
