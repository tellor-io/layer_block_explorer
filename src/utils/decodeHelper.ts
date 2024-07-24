// src/utils/decodeHelper.ts
import { Reader } from 'protobufjs/minimal'

export function decodeData(data: Uint8Array) {
  console.log('decodeData called with data:', data)
  try {
    const reader = new Reader(data)
    while (reader.pos < reader.len) {
      const tag = reader.uint32()
      console.log(`Decoding tag: ${tag}, position: ${reader.pos}`)
      switch (tag >>> 3) {
        case 1: // Assuming '1' is the field number for your expected data
          const myString = reader.string()
          console.log('Decoded string:', myString)
          break
        // Add more cases here based on your Protobuf schema
        default:
          reader.skipType(tag & 7)
          break
      }
    }
  } catch (error) {
    console.error('Failed to decode data:', error)
    // Handle or log the error appropriately
  }
}
