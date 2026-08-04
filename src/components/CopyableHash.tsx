import {
  HStack,
  Icon,
  Text,
  Tooltip,
  useClipboard,
  useColorModeValue,
} from '@chakra-ui/react'
import { FiCopy } from 'react-icons/fi'
import { toHex } from '@cosmjs/encoding'
import { trimHash } from '@/utils/helper'

interface CopyableHashProps {
  hash: Uint8Array
}

export const CopyableHash = ({ hash }: CopyableHashProps) => {
  const hexHash = toHex(hash)
  const { hasCopied, onCopy } = useClipboard(hexHash)
  const chipBg = useColorModeValue('opal.100', 'rgba(238,255,251,0.06)')
  const chipColor = useColorModeValue('pine.800', 'pine.50')

  return (
    <Tooltip
      label={hasCopied ? 'Copied!' : 'Click to copy full hash'}
      closeOnClick={false}
    >
      <HStack
        spacing={1}
        cursor="pointer"
        onClick={onCopy}
        display="inline-flex"
        px={2.5}
        py={0.5}
        borderRadius="full"
        bg={chipBg}
        color={chipColor}
        fontFamily="mono"
        fontSize="12px"
        w="fit-content"
      >
        <Text>{trimHash(hash)}</Text>
        <Icon as={FiCopy} boxSize={3.5} />
      </HStack>
    </Tooltip>
  )
}
