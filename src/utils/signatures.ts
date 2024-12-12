import { sha256, getBytes, Signature, recoverAddress } from 'ethers'

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
          }

          // We found a matching validator
          const v = validatorMap.has(
            recoverAddress(messageHash, { r, s, v: 27 }).toLowerCase()
          )
            ? 27
            : 28
          signatures.push({ v, r, s })

          console.log('Valid signature found for validator:', recoveredAddress)
        } catch (error) {
          console.error('Error recovering address:', error)
          continue
        }
      }
    }

    console.log('Final results:', {
      signatures: signatures.length,
      validators: validators.length,
    })

    return {
      signatures,
      validators,
    }
  } catch (error) {
    console.error('Error deriving signatures:', error)
    throw error
  }
}
