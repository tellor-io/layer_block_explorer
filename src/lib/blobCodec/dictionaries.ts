// Finds and reads the trained dictionary files once, from wherever the code happens to run.
import * as fs from 'fs'
import * as path from 'path'
import { latin1ToBytes } from './text'
import { Dictionary } from './zstd'

export interface LoadedDictionary extends Dictionary {
  path: string
}

// Where the dictionary files live inside this repository
const DICTIONARY_FOLDER = ['src', 'lib', 'blobCodec', 'dictionaries']

const cache = new Map<string, LoadedDictionary | null>()

// Some runtimes replace process with a frozen object that only carries env, so nothing else on it can be assumed
function processInfo(): {
  env?: Record<string, string | undefined>
  cwd?: () => string
} {
  return typeof process === 'object' && process !== null ? process : {}
}

// Compiled by tsc this file sits next to the dictionaries; bundled by Next.js it runs from .next/, so the repository folder is searched upwards and from the working directory
export function candidateDirectories(): string[] {
  const { env, cwd } = processInfo()
  const override = env ? env.BLOB_DICTIONARY_DIR : undefined
  if (override) return [path.resolve(override)]
  const directories: string[] = [path.join(__dirname, 'dictionaries')]
  let directory = __dirname
  for (let depth = 0; depth < 10; depth++) {
    directories.push(path.join(directory, ...DICTIONARY_FOLDER))
    const parent = path.dirname(directory)
    if (parent === directory) break
    directory = parent
  }
  if (typeof cwd === 'function')
    directories.push(path.join(cwd(), ...DICTIONARY_FOLDER))
  return directories.filter(
    (directory, index) => directories.indexOf(directory) === index
  )
}

export function loadDictionary(fileName: string): LoadedDictionary | undefined {
  if (!cache.has(fileName)) {
    let found: LoadedDictionary | null = null
    for (const directory of candidateDirectories()) {
      const file = path.join(directory, fileName)
      if (fs.existsSync(file)) {
        found = {
          name: fileName,
          bytes: latin1ToBytes(fs.readFileSync(file, 'latin1')),
          path: file,
        }
        break
      }
    }
    cache.set(fileName, found)
  }
  return cache.get(fileName) || undefined
}

export function missingDictionaryMessage(fileName: string): string {
  return `dictionary file ${fileName} not found; looked in ${candidateDirectories().join(
    ', '
  )}; copy it into ${DICTIONARY_FOLDER.join(
    '/'
  )} or point BLOB_DICTIONARY_DIR at its folder`
}
