import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSelector } from 'react-redux'
import { selectTmClient, selectRPCAddress } from '@/store/connectSlice'
import {
  Box,
  Heading,
  Text,
  HStack,
  Icon,
  IconButton,
  Input,
  Skeleton,
  useColorMode,
  Button,
  useColorModeValue,
  useDisclosure,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '@chakra-ui/react'
import { FiRadio, FiSearch } from 'react-icons/fi'
import { selectNewBlock } from '@/store/streamSlice'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import { StatusResponse } from '@cosmjs/tendermint-rpc'

const heightRegex = /^\d+$/
const txhashRegex = /^[A-Z\d]{64}$/
const addrRegex = /^[a-z\d]+1[a-z\d]{38,58}$/

export default function Navbar() {
  const router = useRouter()
  const tmClient = useSelector(selectTmClient)
  const rpcAddress = useSelector(selectRPCAddress)
  const newBlock = useSelector(selectNewBlock)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [search, setSearch] = useState('')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  const { colorMode, toggleColorMode } = useColorMode()

  useEffect(() => {
    if (tmClient) {
      tmClient.status().then((res) => {
        setStatus(res)
      })
    }
  }, [tmClient])

  const handleSearch = () => {
    if (heightRegex.test(search)) {
      router.push('/blocks/' + search)
    } else if (txhashRegex.test(search)) {
      router.push('/txs/' + search)
    } else if (addrRegex.test(search)) {
      router.push('/accounts/' + search)
    } else {
      toast({
        title: 'Invalid search',
        description:
          'Please enter a valid block height, transaction hash, or address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  return (
    <Box
      bg={useColorModeValue('light-container', 'dark-container')}
      px={4}
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={1000}
    >
      <HStack h={16} alignItems={'center'} justifyContent={'space-between'}>
        <HStack spacing={8} alignItems={'center'}>
          <Box>
            <Heading size="md">Tellor Layer Block Explorer</Heading>
          </Box>
        </HStack>
        <HStack alignItems={'center'} spacing={4}>
          <HStack maxW="md">
            <Input
              placeholder="Search by height / txhash / address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
            />
            <IconButton
              aria-label="Search"
              icon={<FiSearch />}
              onClick={handleSearch}
            />
          </HStack>
          <Skeleton isLoaded={!!status}>
            <Button leftIcon={<Icon as={FiRadio} />} onClick={onOpen}>
              {status?.nodeInfo.network}
            </Button>
          </Skeleton>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
          />
        </HStack>
      </HStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Network Information</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              <strong>Network:</strong> {status?.nodeInfo.network}
            </Text>
            <Text>
              <strong>Moniker:</strong> {status?.nodeInfo.moniker}
            </Text>
            <Text>
              <strong>Latest Block Height:</strong>{' '}
              {newBlock?.header.height ?? status?.syncInfo.latestBlockHeight}
            </Text>
            <Text>
              <strong>RPC Address:</strong> {rpcAddress}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}
