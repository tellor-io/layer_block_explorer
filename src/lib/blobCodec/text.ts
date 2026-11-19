// Converts between strings and bytes without handing typed arrays across the indexer sandbox boundary, where they become slow proxies.

// Encodes a string as UTF-8, producing the same bytes as Buffer.from(text, "utf8")
export function utf8Encode(text: string): Uint8Array {
  const out = new Uint8Array(text.length * 3)
  let n = 0
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
        i++
      }
    }
    if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd
    if (code < 0x80) {
      out[n++] = code
    } else if (code < 0x800) {
      out[n++] = 0xc0 | (code >> 6)
      out[n++] = 0x80 | (code & 0x3f)
    } else if (code < 0x10000) {
      out[n++] = 0xe0 | (code >> 12)
      out[n++] = 0x80 | ((code >> 6) & 0x3f)
      out[n++] = 0x80 | (code & 0x3f)
    } else {
      out[n++] = 0xf0 | (code >> 18)
      out[n++] = 0x80 | ((code >> 12) & 0x3f)
      out[n++] = 0x80 | ((code >> 6) & 0x3f)
      out[n++] = 0x80 | (code & 0x3f)
    }
  }
  return out.subarray(0, n)
}

const CHUNK = 8192

function flush(units: number[]): string {
  return String.fromCharCode.apply(null, units)
}

// Decodes UTF-8 bytes; malformed sequences become U+FFFD, which never happens for bytes made by utf8Encode
export function utf8Decode(bytes: Uint8Array): string {
  let result = ''
  const units: number[] = []
  const continuation = (index: number) =>
    index < bytes.length && (bytes[index] & 0xc0) === 0x80
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i++]
    let code: number
    if (b0 < 0x80) {
      code = b0
    } else if (b0 >= 0xc2 && b0 < 0xe0 && continuation(i)) {
      code = ((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f)
    } else if (
      b0 >= 0xe0 &&
      b0 < 0xf0 &&
      continuation(i) &&
      continuation(i + 1)
    ) {
      code =
        ((b0 & 0x0f) << 12) | ((bytes[i] & 0x3f) << 6) | (bytes[i + 1] & 0x3f)
      i += 2
      if (code < 0x800 || (code >= 0xd800 && code <= 0xdfff)) code = 0xfffd
    } else if (
      b0 >= 0xf0 &&
      b0 < 0xf5 &&
      continuation(i) &&
      continuation(i + 1) &&
      continuation(i + 2)
    ) {
      code =
        ((b0 & 0x07) << 18) |
        ((bytes[i] & 0x3f) << 12) |
        ((bytes[i + 1] & 0x3f) << 6) |
        (bytes[i + 2] & 0x3f)
      i += 3
      if (code < 0x10000 || code > 0x10ffff) code = 0xfffd
    } else {
      code = 0xfffd
    }
    if (code >= 0x10000) {
      code -= 0x10000
      units.push(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff))
    } else {
      units.push(code)
    }
    if (units.length >= CHUNK) {
      result += flush(units)
      units.length = 0
    }
  }
  return result + flush(units)
}

// One character per byte, the form Buffer calls "latin1"
export function latin1ToBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i)
  return out
}

export function bytesToLatin1(bytes: Uint8Array): string {
  let result = ''
  for (let start = 0; start < bytes.length; start += CHUNK) {
    result += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(start, start + CHUNK))
    )
  }
  return result
}

// Builds a Buffer from local bytes by way of a string, which crosses the sandbox boundary cheaply
export function toBuffer(bytes: Uint8Array): Buffer {
  return Buffer.from(bytesToLatin1(bytes), 'latin1')
}

// Returns bytes usable on this side of the sandbox boundary; a Buffer from the other side is read through one string conversion
export function toLocalBytes(data: Buffer | Uint8Array): Uint8Array {
  const value: unknown = data
  if (value instanceof Uint8Array) return value
  if (Buffer.isBuffer(value)) return latin1ToBytes(value.toString('latin1'))
  return new Uint8Array(value as ArrayLike<number>)
}
