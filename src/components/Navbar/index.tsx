import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSelector } from 'react-redux'
import { selectTmClient, selectRPCAddress } from '@/store/connectSlice'
import {
  Box,
  Heading,
  Text,
  HStack,
  VStack, // Add this import
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
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
} from '@chakra-ui/react'
import { FiRadio, FiSearch, FiMenu } from 'react-icons/fi'
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
  const {
    isOpen: isMenuOpen,
    onOpen: onMenuOpen,
    onClose: onMenuClose,
  } = useDisclosure()

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
          {/* Mobile menu button */}
          <IconButton
            display={{ base: 'flex', md: 'none' }}
            onClick={onMenuOpen}
            icon={<FiMenu />}
            aria-label="Open menu"
            size="md"
          />

          {/* Existing buttons */}
          <HStack display={{ base: 'none', md: 'flex' }}>
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
      </HStack>

      {/* Mobile menu drawer */}
      <Drawer isOpen={isMenuOpen} placement="right" onClose={onMenuClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Menu</DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              <Input
                placeholder="Search by height / txhash / address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                    onMenuClose()
                  }
                }}
              />
              <Button
                leftIcon={<Icon as={FiSearch} />}
                onClick={() => {
                  handleSearch()
                  onMenuClose()
                }}
              >
                Search
              </Button>
              <Button
                leftIcon={<Icon as={FiRadio} />}
                onClick={() => {
                  onOpen()
                  onMenuClose()
                }}
              >
                {status?.nodeInfo.network || 'Network'}
              </Button>
              <Button
                leftIcon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
                onClick={() => {
                  toggleColorMode()
                  onMenuClose()
                }}
              >
                Toggle Theme
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Existing modal */}
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
