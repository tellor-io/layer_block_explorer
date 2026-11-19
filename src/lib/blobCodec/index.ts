// Compresses the transaction and vote-extension JSON blobs for storage and restores them byte for byte.
import * as zlib from 'zlib'
import { loadDictionary, missingDictionaryMessage } from './dictionaries'
import {
  latin1ToBytes,
  toBuffer,
  toLocalBytes,
  utf8Decode,
  utf8Encode,
} from './text'
import { zstdCompress, zstdDecompress } from './zstd'

export type BlobKind = 'transaction' | 'voteExtension'

// Levels 9 to 11 measured within 1% of level 19 on both kinds while compressing 15 to 20 times faster
export const COMPRESSION_LEVEL = 9

// First byte of every stored blob
export const BLOB_VERSION_PLAIN = 0x01
export const BLOB_VERSION_DICTIONARY_V1 = 0x02

export const DICTIONARY_FILES: Record<BlobKind, string> = {
  transaction: 'transaction-v1.dict',
  voteExtension: 'vote-extension-v1.dict',
}

interface BuiltInZstd {
  compress(bytes: Uint8Array): Uint8Array
  decompress(bytes: Uint8Array): Uint8Array
}

type ZlibWithZstd = {
  zstdCompressSync?: (bytes: Buffer, options?: unknown) => Buffer
  zstdDecompressSync?: (bytes: Buffer) => Buffer
  constants: Record<string, number>
}

const warned = new Set<string>()

function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(`blobCodec: ${message}`)
}

function dictionaryFile(kind: BlobKind): string {
  const file = DICTIONARY_FILES[kind]
  if (!file)
    throw new Error(
      `unknown blob kind "${String(
        kind
      )}"; expected "transaction" or "voteExtension"`
    )
  return file
}

// Node 22.15 and later ship zstd in zlib; it ignores dictionaries but reads every frame and has no size cap
function builtInZstd(): BuiltInZstd | undefined {
  const z = zlib as unknown as ZlibWithZstd
  if (
    typeof z.zstdCompressSync !== 'function' ||
    typeof z.zstdDecompressSync !== 'function'
  )
    return undefined
  const compress = z.zstdCompressSync
  const decompress = z.zstdDecompressSync
  const options = {
    params: { [z.constants.ZSTD_c_compressionLevel]: COMPRESSION_LEVEL },
  }
  return {
    compress: (bytes) =>
      latin1ToBytes(compress(toBuffer(bytes), options).toString('latin1')),
    decompress: (bytes) =>
      latin1ToBytes(decompress(toBuffer(bytes)).toString('latin1')),
  }
}

function withVersion(version: number, payload: Uint8Array): Buffer {
  const out = new Uint8Array(payload.length + 1)
  out[0] = version
  out.set(payload, 1)
  return toBuffer(out)
}

export function encodeBlob(kind: BlobKind, text: string): Buffer {
  const bytes = utf8Encode(text)
  const file = dictionaryFile(kind)
  const dictionary = loadDictionary(file)
  const builtIn = builtInZstd()
  if (dictionary) {
    try {
      return withVersion(
        BLOB_VERSION_DICTIONARY_V1,
        zstdCompress(bytes, COMPRESSION_LEVEL, dictionary)
      )
    } catch (error) {
      if (!builtIn) throw error
      warnOnce(
        `fallback:${kind}`,
        `storing a ${bytes.length} byte ${kind} without the dictionary: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  } else {
    warnOnce(
      `missing:${file}`,
      `${missingDictionaryMessage(
        file
      )}; storing ${kind} blobs without a dictionary`
    )
  }
  return withVersion(
    BLOB_VERSION_PLAIN,
    builtIn ? builtIn.compress(bytes) : zstdCompress(bytes, COMPRESSION_LEVEL)
  )
}

export function decodeBlob(kind: BlobKind, data: Buffer | Uint8Array): string {
  const bytes = toLocalBytes(data)
  if (bytes.length === 0) throw new Error(`cannot decode an empty ${kind} blob`)
  const version = bytes[0]
  const payload = bytes.subarray(1)
  if (version === BLOB_VERSION_PLAIN) {
    const builtIn = builtInZstd()
    return utf8Decode(
      builtIn ? builtIn.decompress(payload) : zstdDecompress(payload)
    )
  }
  if (version === BLOB_VERSION_DICTIONARY_V1) {
    const file = dictionaryFile(kind)
    const dictionary = loadDictionary(file)
    if (!dictionary)
      throw new Error(
        `cannot decode ${kind} blob: ${missingDictionaryMessage(file)}`
      )
    return utf8Decode(zstdDecompress(payload, dictionary))
  }
  throw new Error(
    `unknown blob version byte 0x${version
      .toString(16)
      .padStart(
        2,
        '0'
      )} for ${kind}; this codec knows 0x01 (zstd) and 0x02 (zstd with dictionary v1)`
  )
}
