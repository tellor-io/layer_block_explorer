import { sha256, getBytes, Signature, recoverAddress } from 'ethers'

const isLowS = (s: bigint): boolean => {
  // Secp256k1 curve order divided by 2
  const SECP256K1_N_DIV_2 = BigInt(
    '0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0'
  )
  return s <= SECP256K1_N_DIV_2
}

interface Validator {
  ethereumAddress: string
  power: string
}

interface SignatureResult {
  signatures: Signature[]
  validators: {
    addr: string
    power: number
  }[]
}

export const deriveSignatures = async (
  snapshot: string,
  attestationsData: any,
  valset: Validator[]
): Promise<SignatureResult> => {
  try {
    const messageHash = sha256('0x' + snapshot)
    const attestsResponse = attestationsData.attestations

    if (!Array.isArray(attestsResponse)) {
      throw new Error('Invalid attestations data format')
    }

    const signatures: Signature[] = []
    const validators = valset.map((v) => ({
      addr: '0x' + v.ethereumAddress,
      power: parseInt(v.power),
    }))

    // Create a map of validator addresses for quick lookup
    const validatorMap = new Map(
      validators.map((v) => [v.addr.toLowerCase(), v])
    )

    for (let i = 0; i < attestsResponse.length; i++) {
      const attestation = '0x' + attestsResponse[i]

      if (attestation.length === 130) {
        const r = '0x' + attestation.slice(2, 66)
        const s = '0x' + attestation.slice(66, 130)

        try {
          // Try v = 27
          let recoveredAddress = recoverAddress(messageHash, {
            r,
            s,
            v: 27,
          }).toLowerCase()

          let finalV = 27

          // Check if this address is in our validator set
          if (!validatorMap.has(recoveredAddress)) {
            // Try v = 28
            recoveredAddress = recoverAddress(messageHash, {
              r,
              s,
              v: 28,
            }).toLowerCase()

            if (!validatorMap.has(recoveredAddress)) {
              continue // No matching validator found
            }
            finalV = 28
          }

          // We found a matching validator - use the v value that worked
          const signature = Signature.from({
            r,
            s,
            v: finalV,
          })
          signatures.push(signature)
        } catch (error) {
          console.error('Error recovering address:', error)
          continue
        }
      }
    }

    return {
      signatures,
      validators,
    }
  } catch (error) {
    console.error('Error deriving signatures:', error)
    throw error
  }
}
