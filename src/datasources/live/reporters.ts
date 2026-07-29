import type { LiveReporter, LiveReportersResponse } from './types'

export function normalizeReporter(raw: Record<string, unknown>): LiveReporter {
  const metadata = (raw.metadata as Record<string, unknown>) || {}
  return {
    address: String(raw.address || ''),
    power: String(raw.power || '0'),
    metadata: {
      moniker: String(metadata.moniker || ''),
      jailed: Boolean(metadata.jailed),
      min_tokens_required: String(
        metadata.min_tokens_required || metadata.minTokensRequired || '0'
      ),
      commission_rate: String(
        metadata.commission_rate || metadata.commissionRate || '0'
      ),
      last_updated: String(metadata.last_updated || metadata.lastUpdated || ''),
      jailed_until: String(metadata.jailed_until || metadata.jailedUntil || ''),
    },
  }
}

export async function fetchLiveReporters(): Promise<LiveReportersResponse> {
  const response = await fetch('/api/reporters/live')
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.details || body.error || 'Failed to fetch reporters')
  }
  return response.json()
}

const truncateAddress = (address: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

export function mapReporterToTableRow(
  reporter: LiveReporter,
  selectors = 0
) {
  return {
    id: reporter.address,
    displayName: reporter.metadata.moniker || truncateAddress(reporter.address),
    min_tokens_required: reporter.metadata.min_tokens_required,
    commission_rate: reporter.metadata.commission_rate,
    jailed: reporter.metadata.jailed ? 'Yes' : 'No',
    jailed_until:
      reporter.metadata.jailed_until === '1970-01-01T00:00:00'
        ? '0001-01-01T00:00:00Z'
        : reporter.metadata.jailed_until,
    selectors,
    power: reporter.power,
  }
}
