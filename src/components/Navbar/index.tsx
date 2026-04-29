import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSelector, useDispatch } from 'react-redux'
import {
  selectTmClient,
  selectRPCAddress,
  setRPCAddress,
  setTmClient,
  setConnectState,
} from '@/store/connectSlice'
import {
  Box,
  Flex, // Add this import
  Heading,
  Text,
  HStack,
  VStack,
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
  Divider,
  Image,
} from '@chakra-ui/react'
import {
  FiRadio,
  FiSearch,
  FiMenu,
  FiEdit,
  FiHome,
  FiBox,
  FiCompass,
  FiStar,
  FiSliders,
  FiGithub,
  FiAlertCircle,
} from 'react-icons/fi'
/* MIGRATED TO GRAPHQL - Commented out Redux newBlock import
import { selectNewBlock } from '@/store/streamSlice'
*/
import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import { StatusResponse } from '@cosmjs/tendermint-rpc'
import { connectWebsocketClient, validateConnection } from '@/rpc/client'
// GraphQL imports for latest block
import { graphqlQuery } from '@/datasources/graphql/client'
import { GET_SINGLE_LATEST_BLOCK } from '@/datasources/graphql/queries'
import { DashboardLatestBlockResponse } from '@/datasources/graphql/types'
import { LinkItems, RefLinkItems, NavItem } from '@/components/Sidebar'
import { rpcManager } from '../../utils/rpcManager'
import {
  LayerNetwork,
  getNetworkLabel,
  getRpcEndpointsForNetwork,
} from '../../utils/constant'

const heightRegex = /^\d+$/
const txhashRegex = /^[A-Z\d]{64}$/
const addrRegex = /^[a-z\d]+1[a-z\d]{38,58}$/

const Links = [
  { name: 'Blocks', href: '/blocks' },
  { name: 'Validators', href: '/validators' },
  { name: 'Reporters', href: '/reporters' },
  { name: 'Proposals', href: '/proposals' },
  { name: 'Query ID Station', href: '/oracle-bridge' },
]

export default function Navbar() {
  const router = useRouter()
  const tmClient = useSelector(selectTmClient)
  const rpcAddress = useSelector(selectRPCAddress)
  /* MIGRATED TO GRAPHQL - Commented out Redux newBlock selector
   * Now using local state from GraphQL query instead
   */
  // const newBlock = useSelector(selectNewBlock)
  const [latestBlockHeight, setLatestBlockHeight] = useState<string | null>(null)
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
  const dispatch = useDispatch()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [newRPCAddress, setNewRPCAddress] = useState(rpcAddress)
  const activeNetwork = rpcManager.getActiveNetwork()
  const targetNetwork: LayerNetwork =
    activeNetwork === 'mainnet' ? 'palmito' : 'mainnet'

  useEffect(() => {
    if (tmClient) {
      tmClient.status().then((res: StatusResponse) => {
        setStatus(res)
      })
    }
  }, [tmClient])

  useEffect(() => {
    setNewRPCAddress(rpcAddress)
  }, [rpcAddress])

  // GraphQL data fetching for latest block height (only when modal opens)
  // This replaces the Redux newBlock state that was populated by RPC subscriptions
  // Only fetches when the network info modal is opened - no continuous polling needed
  useEffect(() => {
    if (isOpen) {
      const fetchLatestBlock = async () => {
        try {
          const response = await graphqlQuery<DashboardLatestBlockResponse>(GET_SINGLE_LATEST_BLOCK)
          
          if (response?.blocks?.edges?.[0]?.node) {
            const block = response.blocks.edges[0].node
            // Update local state instead of Redux (migrated from RPC subscription)
            setLatestBlockHeight(block.blockHeight)
          }
        } catch (error) {
          console.error('Error fetching latest block from GraphQL in Navbar:', error)
        }
      }

      // Fetch once when modal opens
      fetchLatestBlock()
    }
  }, [isOpen])

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

  const handleEditRPCAddress = async () => {
    try {
      // If user is inputting a custom RPC, use it directly
      if (newRPCAddress) {
        const isValid = await validateConnection(newRPCAddress)
        if (!isValid) {
          toast({
            title: 'Connection Error',
            description: 'Unable to connect to custom RPC endpoint.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
          return
        }

        // Set the custom endpoint in the manager
        rpcManager.setCustomEndpoint(newRPCAddress)

        const tmClient = await connectWebsocketClient(newRPCAddress)
        if (tmClient) {
          dispatch(setConnectState(true))
          dispatch(setTmClient(tmClient))
          dispatch(setRPCAddress(newRPCAddress))
          setIsEditModalOpen(false)
          toast({
            title: 'RPC Connection Established',
            description: `Connected to custom endpoint`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          })
        }
      } else {
        // Use the fallback mechanism if no custom RPC is provided
        const endpoint = await rpcManager.getCurrentEndpoint()
        const isValid = await validateConnection(endpoint)

        if (!isValid) {
          await rpcManager.reportFailure(endpoint)
          toast({
            title: 'Connection Error',
            description: 'Trying fallback endpoint...',
            status: 'warning',
            duration: 3000,
            isClosable: true,
          })
          // Retry with next endpoint
          handleEditRPCAddress()
          return
        }

        const tmClient = await connectWebsocketClient(endpoint)
        if (tmClient) {
          await rpcManager.reportSuccess(endpoint)
          dispatch(setConnectState(true))
          dispatch(setTmClient(tmClient))
          dispatch(setRPCAddress(endpoint))
          setIsEditModalOpen(false)
          toast({
            title: 'RPC Connection Established',
            description: `Connected to ${endpoint}`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          })
        }
      }
    } catch (error) {
      console.error('Error connecting to RPC:', error)
      toast({
        title: 'Connection Error',
        description: 'Failed to connect. Reverting to fallback endpoints...',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })

      // Clear custom endpoint and fall back to default endpoints
      rpcManager.setCustomEndpoint(null)
      handleEditRPCAddress()
    }
  }

  const handleSwitchNetwork = async () => {
    try {
      const nextEndpoints = getRpcEndpointsForNetwork(targetNetwork)
      const primaryEndpoint = nextEndpoints[0]
      if (!primaryEndpoint) {
        toast({
          title: 'Error',
          description: `No RPC endpoint configured for ${getNetworkLabel(targetNetwork)}.`,
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        return
      }

      const isValid = await validateConnection(primaryEndpoint)
      if (!isValid) {
        toast({
          title: 'Connection Error',
          description: `Unable to connect to ${primaryEndpoint}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        return
      }

      await rpcManager.setActiveNetwork(targetNetwork)
      const tmClient = await connectWebsocketClient(primaryEndpoint)
      if (tmClient) {
        dispatch(setConnectState(true))
        dispatch(setTmClient(tmClient))
        dispatch(setRPCAddress(primaryEndpoint))
        onClose() // Close the modal
        toast({
          title: 'Network Switched',
          description: `Connected to ${getNetworkLabel(targetNetwork)}.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
        router.reload()
      }
    } catch (error) {
      console.error('Error switching network:', error)
      toast({
        title: 'Network Switch Failed',
        description: 'Failed to connect to the selected network RPC endpoint.',
        status: 'error',
        duration: 5000,
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
      zIndex={2}
      width="100%"
    >
      <Flex h="80px" alignItems={'center'} justifyContent={'space-between'}>
        <Flex alignItems={'center'} h="full">
          <Box px={0} py={4}>
            <Flex alignItems="center" gap={4}>
              <Image
                src={useColorModeValue('/AllDrk.png', '/AllWht.png')}
                alt="Tellor Logo"
                height={{ base: '40px', md: 'min(4vw, 50px)' }}
                width={{ base: 'auto', md: 'auto' }}
                objectFit="contain"
                transition="height 0.2s ease-in-out"
              />
            </Flex>
          </Box>
        </Flex>
        <Flex alignItems={'center'}>
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
                {status?.nodeInfo.network === 'tellor-1'
                  ? 'Mainnet'
                  : status?.nodeInfo.network === 'layertest-4'
                  ? 'Palmito Testnet'
                  : status?.nodeInfo.network || 'Network'}
              </Button>
            </Skeleton>
            <IconButton
              aria-label="Toggle color mode"
              icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
            />
          </HStack>
        </Flex>
      </Flex>

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
                {status?.nodeInfo.network === 'tellor-1'
                  ? 'Mainnet'
                  : status?.nodeInfo.network === 'layertest-4'
                  ? 'Palmito Testnet'
                  : status?.nodeInfo.network || 'Network'}
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
              <Divider />
              {LinkItems.map((link) => (
                <NavItem
                  key={link.name}
                  icon={link.icon}
                  route={link.route}
                  onClick={onMenuClose}
                >
                  {link.name}
                </NavItem>
              ))}
              <Divider />
              <Heading size="xs" textTransform="uppercase" mb={2}>
                Links
              </Heading>
              {RefLinkItems.map((link) => (
                <NavItem
                  key={link.name}
                  icon={link.icon}
                  route={link.route}
                  isBlank={link.isBlank}
                  onClick={onMenuClose}
                >
                  {link.name}
                </NavItem>
              ))}
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
              <strong>Network:</strong>{' '}
              {status?.nodeInfo.network === 'tellor-1'
                ? 'Mainnet'
                : status?.nodeInfo.network === 'layertest-4'
                ? 'Palmito Testnet'
                : status?.nodeInfo.network || 'Unknown Network'}
            </Text>
            <Text>
              <strong>Chain ID:</strong> {status?.nodeInfo.network}
            </Text>

            <Text>
              <strong>Latest Block Height:</strong>{' '}
              {latestBlockHeight ?? status?.syncInfo.latestBlockHeight}
            </Text>
            <HStack>
              <Text>
                <strong>RPC Address:</strong> {rpcAddress}
              </Text>
              <IconButton
                aria-label="Edit RPC Address"
                icon={<FiEdit />}
                size="xs"
                variant="ghost"
                padding={0}
                minWidth="auto"
                onClick={() => setIsEditModalOpen(true)}
              />
            </HStack>
            <Button
              size="sm"
              variant="outline"
              colorScheme="blue"
              onClick={handleSwitchNetwork}
              mt={2}
            >
              {`Switch to ${getNetworkLabel(targetNetwork)}`}
            </Button>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit RPC Address</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              value={newRPCAddress}
              onChange={(e) => setNewRPCAddress(e.target.value)}
              placeholder="Enter new RPC address"
            />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleEditRPCAddress}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}
