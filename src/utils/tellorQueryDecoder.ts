/**
 * Decodes ABI-encoded Tellor SpotPrice query data
 * 
 * The encoding format is: (string queryType, tuple(string asset, string currency))
 * 
 * @param hexData - Hex-encoded query data (with or without 0x prefix)
 * @returns Decoded pair in format "ASSET/CURRENCY" or null if decoding fails
 */
export function decodeSpotPriceQueryData(hexData: string): string | null {
  try {
    // Remove 0x prefix if present
    const cleanHex = hexData.startsWith('0x') ? hexData.slice(2) : hexData
    
    // Ensure we have valid hex data
    if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
      console.error('Invalid hex data format')
      return null
    }

    // Use manual decoder to parse ABI-encoded structure
    // The ABI encoding uses dynamic offsets that standard ABI decoders struggle with
    return decodeSpotPriceManually(cleanHex)
  } catch (error) {
    console.error('Error decoding SpotPrice query data:', error)
    return null
  }
}

/**
 * Manual fallback decoder for SpotPrice query data
 * Parses the ABI-encoded structure manually
 * 
 * Format: (string queryType, tuple(string asset, string currency))
 * ABI encoding structure:
 * - Offset 0 (32 bytes): offset to queryType string (typically 0x40 = 64)
 * - Offset 1 (32 bytes): offset to tuple (typically 0x80 = 128)
 * - Query type string at offset: length (32 bytes) + data (padded to 32 bytes)
 * - Tuple at offset: asset offset (32 bytes) + currency offset (32 bytes)
 * - Asset string at asset offset: length (32 bytes) + data (padded to 32 bytes)
 * - Currency string at currency offset: length (32 bytes) + data (padded to 32 bytes)
 */
function decodeSpotPriceManually(hexData: string): string | null {
  try {
    const buffer = Buffer.from(hexData, 'hex')
    
    // Read first offset (queryType string offset) - bytes 0-31
    const queryTypeOffsetHex = buffer.slice(0, 32).toString('hex')
    const queryTypeOffset = Number(BigInt('0x' + queryTypeOffsetHex))
    
    // Read second offset (tuple offset) - bytes 32-63
    const tupleOffsetHex = buffer.slice(32, 64).toString('hex')
    const tupleOffset = Number(BigInt('0x' + tupleOffsetHex))
    
    // Validate offsets are within buffer bounds
    if (queryTypeOffset >= buffer.length || tupleOffset >= buffer.length) {
      console.error('Invalid offsets in query data')
      return null
    }
    
    // Read query type length and data
    const queryTypeLengthHex = buffer.slice(queryTypeOffset, queryTypeOffset + 32).toString('hex')
    const queryTypeLength = Number(BigInt('0x' + queryTypeLengthHex))
    
    if (queryTypeOffset + 32 + queryTypeLength > buffer.length) {
      console.error('Query type data extends beyond buffer')
      return null
    }
    
    const queryType = buffer.slice(queryTypeOffset + 32, queryTypeOffset + 32 + queryTypeLength).toString('utf8')
    
    if (queryType.toLowerCase() !== 'spotprice') {
      console.warn(`Unexpected query type: ${queryType}`)
      return null
    }
    
    // In ABI encoding, dynamic data for tuples is stored after the tuple structure.
    // The tuple contains offsets (64 bytes), then the actual string data follows.
    // Based on the actual hex structure, the asset data starts after the tuple + some padding.
    // Tuple ends at tupleOffset + 64 = 192, but asset length is at 224.
    // So we skip 32 bytes (one offset slot) and then read the strings sequentially.
    
    // Start after tuple (tupleOffset + 64) + 32 bytes (skip offset values)
    let currentOffset = tupleOffset + 64 + 32
    
    // Read asset: length field followed by data
    if (currentOffset + 32 > buffer.length) {
      console.error('Not enough data for asset length')
      return null
    }
    
    const assetLengthHex = buffer.slice(currentOffset, currentOffset + 32).toString('hex')
    const assetLength = Number(BigInt('0x' + assetLengthHex))
    currentOffset += 32
    
    if (currentOffset + assetLength > buffer.length) {
      console.error('Not enough data for asset string')
      return null
    }
    
    // Extract asset string
    const assetBytes = buffer.slice(currentOffset, currentOffset + assetLength)
    const asset = assetBytes.toString('utf8')
    currentOffset += assetLength
    
    // Round up to next 32-byte boundary for padding
    currentOffset = Math.ceil(currentOffset / 32) * 32
    
    // Read currency: length field followed by data
    if (currentOffset + 32 > buffer.length) {
      console.error('Not enough data for currency length')
      return null
    }
    
    const currencyLengthHex = buffer.slice(currentOffset, currentOffset + 32).toString('hex')
    const currencyLength = Number(BigInt('0x' + currencyLengthHex))
    currentOffset += 32
    
    if (currentOffset + currencyLength > buffer.length) {
      console.error('Not enough data for currency string')
      return null
    }
    
    // Extract currency string
    const currencyBytes = buffer.slice(currentOffset, currentOffset + currencyLength)
    const currency = currencyBytes.toString('utf8')
    
    // Return clean pair format
    return `${asset.toUpperCase()}/${currency.toUpperCase()}`
  } catch (error) {
    console.error('Manual decode failed:', error)
    return null
  }
}

/**
 * Decodes multiple ABI-encoded SpotPrice query data strings
 * 
 * @param hexDataArray - Array of hex-encoded query data strings
 * @returns Array of decoded pairs in format "ASSET/CURRENCY"
 */
export function decodeSpotPriceQueryDataArray(hexDataArray: string[]): string[] {
  const decodedPairs: string[] = []
  
  for (const hexData of hexDataArray) {
    const pair = decodeSpotPriceQueryData(hexData)
    if (pair) {
      decodedPairs.push(pair)
    }
  }
  
  return decodedPairs
}

