import { HStack, Icon, Text, Tooltip, useClipboard } from '@chakra-ui/react'
import { FiCopy } from 'react-icons/fi'
import { toHex } from '@cosmjs/encoding'
import { trimHash } from '@/utils/helper'

interface CopyableHashProps {
  hash: Uint8Array
}

export const CopyableHash = ({ hash }: CopyableHashProps) => {
  const hexHash = toHex(hash)
  const { hasCopied, onCopy } = useClipboard(hexHash)

  return (
    <Tooltip
      label={hasCopied ? 'Copied!' : 'Click to copy full hash'}
      closeOnClick={false}
    >
      <HStack spacing={1} cursor="pointer" onClick={onCopy}>
        <Text>{trimHash(hash)}</Text>
        <Icon as={FiCopy} boxSize={4} />
      </HStack>
    </Tooltip>
  )
}
