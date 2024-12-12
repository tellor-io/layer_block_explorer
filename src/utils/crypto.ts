import { sha256 } from '@cosmjs/crypto'
import { toHex } from '@cosmjs/encoding'

export function pubkeyToAddress(pubkey: string): string {
  const hash = sha256(Buffer.from(pubkey, 'base64'))
  return toHex(hash.slice(0, 20)).toLowerCase()
}
