import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import { toHex } from '@cosmjs/encoding'
import { bech32 } from 'bech32'
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin'

export const timeFromNow = (date: string): string => {
  dayjs.extend(relativeTime)
  return dayjs(date).fromNow()
}

export const trimHash = (txHash: Uint8Array): string => {
  const hash = toHex(txHash).toUpperCase()
  const first = hash.slice(0, 5)
  const last = hash.slice(hash.length - 5, hash.length)
  return first + '...' + last
}

export const displayDate = (date: string): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

export const displayDurationSeconds = (seconds: number | undefined): string => {
  if (!seconds) {
    return ``
  }
  dayjs.extend(duration)
  dayjs.extend(relativeTime)
  return dayjs.duration({ seconds: seconds }).humanize()
}

export const isBech32Address = (address: string): Boolean => {
  try {
    const decoded = bech32.decode(address)
    if (decoded.prefix.includes('valoper')) {
      return false
    }

    if (decoded.words.length < 1) {
      return false
    }

    const encoded = bech32.encode(decoded.prefix, decoded.words)
    return encoded === address
  } catch (e) {
    return false
  }
}

export const convertVotingPower = (tokens: string): number => {
  return Math.round(Number(tokens) / 10 ** 6)
}

export const convertRateToPercent = (rate: string | undefined): string => {
  if (!rate) {
    return ``
  }
  const commission = (Number(rate) / 10 ** 16).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${commission}%`
}

export const displayCoin = (deposit: Coin) => {
  if (deposit.denom.startsWith('u')) {
    const amount = Math.round(Number(deposit.amount) / 10 ** 6)
    const symbol = deposit.denom.slice(1).toUpperCase()
    return `${amount.toLocaleString()} ${symbol}`
  }
  return `${Number(deposit.amount).toLocaleString()} ${deposit.denom}`
}

export const getTypeMsg = (typeUrl: string): string => {
  const arr = typeUrl.split('.')
  if (arr.length) {
    return arr[arr.length - 1].replace('Msg', '')
  }
  return ''
}

/**
 * Converts a given address to an operator address.
 * This is a placeholder function. Replace the logic with your actual conversion logic.
 * @param address - The address to convert.
 * @returns The converted operator address.
 */
export function convertAddressToOperator(address: string): string {
  // Replace this with your actual conversion logic
  return `operator-${address}`
}

export const stripAddressPrefix = (address: string): string => {
  // First remove tellorvaloper, then tellor, then valoper
  return address
    .replace(/^tellorvaloper/, '')
    .replace(/^tellor/, '')
    .replace(/^valoper/, '')
}

// Utility function to check if a validator is active (bonded)
export const isActiveValidator = (status: string | number): boolean => {
  // Handle both string and numeric status formats
  if (typeof status === 'string') {
    return status === 'BOND_STATUS_BONDED'
  } else if (typeof status === 'number') {
    return status === 3 // BOND_STATUS_BONDED = 3
  }
  return false
}
