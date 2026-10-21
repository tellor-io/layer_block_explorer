import { useEffect, useMemo, useState, type ReactNode } from 'react'
import NextLink from 'next/link'
import {
  Box,
  Center,
  Divider,
  Flex,
  Heading,
  Link,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react'
import DelegationPieChart from '@/components/DelegationPieChart'
import { fetchValidatorDetail } from '@/datasources/live/validators'
import { useValidatorDelegations } from '@/datasources/live/useValidatorDelegations'
import type { ValidatorCoin, ValidatorDetail } from '@/datasources/live/types'
import { convertRateToPercent, displayDate } from '@/utils/helper'

const STATUS_LABELS: Record<string, string> = {
  BOND_STATUS_BONDED: 'BONDED',
  BOND_STATUS_UNBONDING: 'UNBONDING',
  BOND_STATUS_UNBONDED: 'UNBONDED',
  BOND_STATUS_UNSPECIFIED: 'UNSPECIFIED',
}

function loyaToTrb(amount: string): string {
  const n = Number(amount)
  if (!Number.isFinite(n)) return amount
  const trb = n / 1e6
  if (trb > 0 && trb < 0.000001) return '< 0.000001 TRB'
  return `${trb.toLocaleString(undefined, {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  })} TRB`
}

function formatShares(shares: string): string {
  const n = Number(shares)
  if (!Number.isFinite(n)) return shares
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatCoins(coins: ValidatorCoin[] | null): string {
  if (!coins) return '—'
  if (coins.length === 0) return '0'
  return coins
    .map((coin) => (coin.denom === 'loya' ? loyaToTrb(coin.amount) : `${coin.amount} ${coin.denom}`))
    .join(', ')
}

function formatJailedUntil(iso: string): string {
  const time = Date.parse(iso)
  if (!iso || !Number.isFinite(time) || time <= 0) return '—'
  return displayDate(iso)
}

function websiteHref(website: string): string {
  if (/^https?:\/\//i.test(website)) return website
  return `https://${website}`
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tr>
      <Td pl={0} width={180} verticalAlign="top">
        <b>{label}</b>
      </Td>
      <Td wordBreak="break-all">{children}</Td>
    </Tr>
  )
}

export default function ValidatorOperatorView({
  operatorAddress,
}: {
  operatorAddress: string
}) {
  const [validator, setValidator] = useState<ValidatorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const {
    delegations,
    isLoading: delegationsLoading,
    error: delegationsError,
  } = useValidatorDelegations(operatorAddress)
  const containerBg = useColorModeValue('light-container', 'dark-container')
  const borderColor = useColorModeValue('border.light', 'border.dark')
  const linkColor = useColorModeValue('light-theme', 'dark-theme')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setValidator(null)

    fetchValidatorDetail(operatorAddress)
      .then((detail) => {
        if (!cancelled) setValidator(detail)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch validator')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [operatorAddress])

  const delegatorRows = useMemo(() => {
    return [...delegations].sort((a, b) => {
      const av = Number(a.balance?.amount || a.shares || 0)
      const bv = Number(b.balance?.amount || b.shares || 0)
      return bv - av
    })
  }, [delegations])

  return (
    <>
      <Box
        mt={8}
        bg={containerBg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="2xl"
        p={4}
      >
        <Heading size="md" mb={4}>
          Validator
        </Heading>
        <Divider borderColor="gray" mb={4} />
        {loading ? (
          <Center py={8}>
            <Spinner size="lg" />
          </Center>
        ) : error ? (
          <Text color="red.500">{error}</Text>
        ) : validator ? (
          <TableContainer>
            <Table variant="unstyled" size="sm">
              <Tbody>
                <Row label="Moniker">{validator.moniker || '—'}</Row>
                <Row label="Operator address">{validator.operatorAddress}</Row>
                <Row label="Consensus address">{validator.consensusAddress || '—'}</Row>
                <Row label="Consensus pubkey">{validator.consensusPubkey || '—'}</Row>
                <Row label="Status">
                  {STATUS_LABELS[validator.status] || validator.status || 'UNKNOWN'}
                  {validator.jailed ? ' · JAILED' : ''}
                </Row>
                <Row label="Missed blocks">
                  {validator.signingInfo
                    ? Number(validator.signingInfo.missedBlocksCounter).toLocaleString()
                    : '—'}
                </Row>
                <Row label="Tombstoned">
                  {validator.signingInfo ? (validator.signingInfo.tombstoned ? 'Yes' : 'No') : '—'}
                </Row>
                <Row label="Jailed until">
                  {validator.signingInfo ? formatJailedUntil(validator.signingInfo.jailedUntil) : '—'}
                </Row>
                <Row label="Tokens">{loyaToTrb(validator.tokens)}</Row>
                <Row label="Outstanding rewards">{formatCoins(validator.outstandingRewards)}</Row>
                <Row label="Accrued commission">{formatCoins(validator.accruedCommission)}</Row>
                <Row label="Delegator shares">{formatShares(validator.delegatorShares)}</Row>
                <Row label="Min self-delegation">{loyaToTrb(validator.minSelfDelegation)}</Row>
                <Row label="Commission">{convertRateToPercent(validator.commissionRate)}</Row>
                <Row label="Max commission">{convertRateToPercent(validator.commissionMaxRate)}</Row>
                <Row label="Max commission change">
                  {convertRateToPercent(validator.commissionMaxChangeRate)}
                </Row>
                <Row label="Commission updated">
                  {validator.commissionUpdateTime
                    ? displayDate(validator.commissionUpdateTime)
                    : '—'}
                </Row>
                <Row label="Unbonding height">{validator.unbondingHeight || '—'}</Row>
                <Row label="Unbonding time">
                  {validator.unbondingTime ? displayDate(validator.unbondingTime) : '—'}
                </Row>
                {validator.identity ? <Row label="Identity">{validator.identity}</Row> : null}
                {validator.website ? (
                  <Row label="Website">
                    <Link href={websiteHref(validator.website)} isExternal color={linkColor}>
                      {validator.website}
                    </Link>
                  </Row>
                ) : null}
                {validator.securityContact ? (
                  <Row label="Contact">{validator.securityContact}</Row>
                ) : null}
                {validator.details ? <Row label="Details">{validator.details}</Row> : null}
              </Tbody>
            </Table>
          </TableContainer>
        ) : null}
      </Box>

      <Box
        mt={8}
        bg={containerBg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="2xl"
        p={4}
      >
        <Heading size="md" mb={1}>
          Delegations
        </Heading>
        <Text fontSize="sm" color="gray.500" mb={4}>
          {delegationsLoading
            ? 'Loading delegators'
            : `${delegatorRows.length.toLocaleString()} delegators`}
        </Text>
        <Divider borderColor="gray" mb={4} />
        {delegationsError ? (
          <Text color="red.500">{delegationsError}</Text>
        ) : (
          <Flex direction="column" gap={4}>
            <DelegationPieChart validatorAddress={operatorAddress} width={420} height={200} />
            <TableContainer w="full" maxH="420px" overflowY="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Delegator</Th>
                    <Th>Amount</Th>
                    <Th>Shares</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {delegatorRows.map((delegation) => (
                    <Tr key={delegation.delegatorAddress}>
                      <Td>
                        <Link
                          as={NextLink}
                          href={'/accounts/' + delegation.delegatorAddress}
                          color={linkColor}
                          wordBreak="break-all"
                        >
                          {delegation.delegatorAddress}
                        </Link>
                      </Td>
                      <Td>
                        {delegation.balance
                          ? loyaToTrb(delegation.balance.amount)
                          : '—'}
                      </Td>
                      <Td>{formatShares(delegation.shares)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Flex>
        )}
      </Box>
    </>
  )
}
