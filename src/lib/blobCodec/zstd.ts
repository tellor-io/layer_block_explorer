// Runs the zstd WebAssembly build shipped inside zstd-codec and exposes the few calls the blob codec needs.
import { latin1ToBytes } from './text'

// The compiled module caps its heap at 16 MB and cannot grow, so documents of several megabytes fail here and the caller stores them another way.
export const WASM_HEAP_BYTES = 16 * 1024 * 1024

export interface Dictionary {
  // Stable name used to cache the prepared form of the dictionary, usually the file name
  name: string
  bytes: Uint8Array
}

interface ByteVector {
  resize(size: number, fill: number): void
  delete(): void
}

interface DictionaryHandle {
  delete(): void
}

interface CodecHandle {
  compressBound(size: number): number
  contentSize(source: ByteVector): number
  compress(target: ByteVector, source: ByteVector, level: number): number
  decompress(target: ByteVector, source: ByteVector): number
  compressUsingDict(
    target: ByteVector,
    source: ByteVector,
    dictionary: DictionaryHandle
  ): number
  decompressUsingDict(
    target: ByteVector,
    source: ByteVector,
    dictionary: DictionaryHandle
  ): number
}

interface Runtime {
  ZstdCodec: new () => CodecHandle
  VectorU8: new () => ByteVector
  cloneToVector(target: ByteVector, source: Uint8Array): void
  cloneAsTypedArray(source: ByteVector): Uint8Array
  createCompressionDict(bytes: Uint8Array, level: number): DictionaryHandle
  createDecompressionDict(bytes: Uint8Array): DictionaryHandle
}

interface Session {
  runtime: Runtime
  codec: CodecHandle
  compressionDictionaries: Map<string, DictionaryHandle>
  decompressionDictionaries: Map<string, DictionaryHandle>
  flags: { aborted: boolean }
}

type RuntimeFactory = (settings: Record<string, unknown>) => void

// zstd-codec embeds the WebAssembly binary in this script as a base64 data URI and would normally load it asynchronously
const startRuntime: RuntimeFactory = require('zstd-codec/lib/zstd-codec-binding-wasm.js')

let compiledModule: WebAssembly.Module | undefined
let session: Session | undefined

export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function compileModule(): WebAssembly.Module {
  if (!compiledModule) {
    const match =
      /data:application\/octet-stream;base64,([A-Za-z0-9+/=]+)/.exec(
        startRuntime.toString()
      )
    if (!match) {
      throw new Error(
        'zstd-codec: WebAssembly binary not found inside zstd-codec-binding-wasm.js; this codec is written against zstd-codec 0.1.5'
      )
    }
    compiledModule = new WebAssembly.Module(
      latin1ToBytes(Buffer.from(match[1], 'base64').toString('latin1'))
        .buffer as ArrayBuffer
    )
  }
  return compiledModule
}

// Instantiating the compiled module ourselves makes start-up synchronous, so the first call can compress right away
function startSession(): Session {
  let ready = false
  const flags = { aborted: false }
  const settings: Record<string, unknown> = {
    instantiateWasm(
      imports: WebAssembly.Imports,
      receive: (instance: WebAssembly.Instance) => void
    ) {
      const instance = new WebAssembly.Instance(compileModule(), imports)
      receive(instance)
      return instance.exports
    },
    onRuntimeInitialized() {
      ready = true
    },
    onAbort() {
      flags.aborted = true
    },
    print() {},
    printErr() {},
  }
  startRuntime(settings)
  if (!ready)
    throw new Error('zstd-codec did not finish starting synchronously')
  const runtime = settings as unknown as Runtime
  return {
    runtime,
    codec: new runtime.ZstdCodec(),
    compressionDictionaries: new Map(),
    decompressionDictionaries: new Map(),
    flags,
  }
}

function currentSession(): Session {
  if (!session) session = startSession()
  return session
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// Runs one operation; a heap exhaustion aborts the whole runtime, so the next call starts a fresh one
function run<T>(action: string, work: (active: Session) => T): T {
  const active = currentSession()
  try {
    return work(active)
  } catch (error) {
    if (active.flags.aborted && session === active) session = undefined
    throw new Error(`zstd (WebAssembly) ${action} failed: ${describe(error)}`)
  }
}

function withVector<T>(runtime: Runtime, use: (vector: ByteVector) => T): T {
  const vector = new runtime.VectorU8()
  try {
    return use(vector)
  } finally {
    try {
      vector.delete()
    } catch {
      // The runtime is already unusable when this fails and is replaced on the next call
    }
  }
}

function compressionDictionary(
  active: Session,
  dictionary: Dictionary,
  level: number
): DictionaryHandle {
  const key = `${dictionary.name}@${level}`
  let handle = active.compressionDictionaries.get(key)
  if (!handle) {
    handle = active.runtime.createCompressionDict(dictionary.bytes, level)
    active.compressionDictionaries.set(key, handle)
  }
  return handle
}

function decompressionDictionary(
  active: Session,
  dictionary: Dictionary
): DictionaryHandle {
  let handle = active.decompressionDictionaries.get(dictionary.name)
  if (!handle) {
    handle = active.runtime.createDecompressionDict(dictionary.bytes)
    active.decompressionDictionaries.set(dictionary.name, handle)
  }
  return handle
}

export function zstdCompress(
  bytes: Uint8Array,
  level: number,
  dictionary?: Dictionary
): Uint8Array {
  return run('compress', (active) =>
    withVector(active.runtime, (source) =>
      withVector(active.runtime, (target) => {
        active.runtime.cloneToVector(source, bytes)
        target.resize(active.codec.compressBound(bytes.length), 0)
        const written = dictionary
          ? active.codec.compressUsingDict(
              target,
              source,
              compressionDictionary(active, dictionary, level)
            )
          : active.codec.compress(target, source, level)
        if (written < 0) throw new Error(`zstd error code ${written}`)
        target.resize(written, 0)
        return active.runtime.cloneAsTypedArray(target)
      })
    )
  )
}

// Only frames that record their content size can be decoded here; Node's built-in zstd handles the rest
export function zstdDecompress(
  bytes: Uint8Array,
  dictionary?: Dictionary
): Uint8Array {
  return run('decompress', (active) =>
    withVector(active.runtime, (source) =>
      withVector(active.runtime, (target) => {
        active.runtime.cloneToVector(source, bytes)
        const size = active.codec.contentSize(source)
        if (!(Number.isSafeInteger(size) && size >= 0))
          throw new Error('frame does not record its content size')
        if (size > WASM_HEAP_BYTES)
          throw new Error(
            `content size ${size} exceeds the ${WASM_HEAP_BYTES} byte WebAssembly heap`
          )
        if (size === 0) return new Uint8Array(0)
        target.resize(size, 0)
        const written = dictionary
          ? active.codec.decompressUsingDict(
              target,
              source,
              decompressionDictionary(active, dictionary)
            )
          : active.codec.decompress(target, source)
        if (written !== size) throw new Error(`zstd error code ${written}`)
        return active.runtime.cloneAsTypedArray(target)
      })
    )
  )
}
