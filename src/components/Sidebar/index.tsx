import React, { ReactNode, useEffect, useState } from 'react'
import {
  IconButton,
  Box,
  CloseButton,
  Flex,
  Icon,
  useColorModeValue,
  Link,
  Drawer,
  DrawerContent,
  Text,
  useDisclosure,
  BoxProps,
  FlexProps,
  Button,
  Heading,
  DrawerOverlay,
  VStack,
} from '@chakra-ui/react'
import {
  FiHome,
  FiBox,
  FiCompass,
  FiStar,
  FiSliders,
  FiMenu,
  FiLogOut,
  FiGithub,
  FiAlertCircle,
  FiDatabase,
  FiFileText,
  FiUsers,
  FiActivity,
  FiDollarSign,
} from 'react-icons/fi'
import { IconType } from 'react-icons'
import { RiBearSmileFill, RiBankLine } from 'react-icons/ri'
import { FaUserCheck } from 'react-icons/fa'
import { FaBridge } from 'react-icons/fa6'

import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { selectSubsNewBlock, selectSubsTxEvent } from '@/store/streamSlice'
import { useSelector } from 'react-redux'
import { LS_RPC_ADDRESS } from '@/utils/constant'
import { GiFactory, GiGavel, GiArchBridge } from 'react-icons/gi'
import { TbChartBubbleFilled } from 'react-icons/tb'
import { MdPersonSearch } from 'react-icons/md'
import { BsPersonFillAdd, BsPersonCheck } from 'react-icons/bs'

interface LinkItemProps {
  name: string
  icon: IconType
  route: string
  isBlank?: boolean
}
export const LinkItems: Array<LinkItemProps> = [
  { name: 'Home', icon: FiHome, route: '/' },
  { name: 'Blocks', icon: FiBox, route: '/blocks' },
  { name: 'Validators', icon: BsPersonCheck, route: '/validators' },
  { name: 'Data Feed', icon: FiActivity, route: '/data-feed' },
  { name: 'Reporters', icon: BsPersonFillAdd, route: '/reporters' },
  { name: 'Proposals', icon: GiGavel, route: '/proposals' },
  { name: 'Parameters', icon: FiSliders, route: '/parameters' },
  { name: 'Layer Blobs', icon: TbChartBubbleFilled, route: '/oracle-bridge' },
  { name: 'Bridge Deposits', icon: FaBridge, route: '/bridge-deposits' },
]
export const RefLinkItems: Array<LinkItemProps> = [
  {
    name: 'Github',
    icon: FiGithub,
    route: 'https://github.com/tellor-io/layer_block_explorer',
    isBlank: true,
  },
  {
    name: 'Report Issues',
    icon: FiAlertCircle,
    route: 'https://github.com/tellor-io/layer_block_explorer/issues',
    isBlank: true,
  },
]

interface SidebarProps extends BoxProps {
  onClose?: () => void // Make onClose optional
}

export default function Sidebar({ onClose, children }: SidebarProps) {
  const { isOpen, onOpen, onClose: closeDrawer } = useDisclosure()

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.100', 'gray.900')}>
      <SidebarContent
        onClose={closeDrawer}
        display={{ base: 'none', md: 'block' }}
      />
      <Drawer
        autoFocus={false}
        isOpen={isOpen}
        placement="left"
        onClose={closeDrawer}
        returnFocusOnClose={false}
        onOverlayClick={closeDrawer}
        size="xs" // Change this from "full" to "xs"
      >
        <DrawerOverlay />
        <DrawerContent>
          <SidebarContent onClose={closeDrawer} />
        </DrawerContent>
      </Drawer>
      {/* mobilenav */}
      <MobileNav display={{ base: 'flex', md: 'none' }} onOpen={onOpen} />
      <Box ml={{ base: 0, md: -80 }} p="4">
        {children}
      </Box>
    </Box>
  )
}

interface SidebarProps extends BoxProps {
  onClose?: () => void // Make onClose optional
}

const SidebarContent = ({ onClose, ...rest }: SidebarProps) => {
  const subsNewBlock = useSelector(selectSubsNewBlock)
  const subsTxEvent = useSelector(selectSubsTxEvent)

  return (
    <Box
      transition="3s ease"
      bg={useColorModeValue('light-container', 'dark-container')}
      borderRight="1px"
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="100vh"
      overflowY="auto"
      display="flex"
      flexDirection="column"
      css={{
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          width: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: useColorModeValue('gray.300', 'gray.700'),
          borderRadius: '24px',
        },
      }}
      {...rest}
    >
      <Box
        flex="1"
        pt="20px"
        pb="80px" // Increased bottom padding significantly
        minH="min-content"
      >
        <VStack spacing={4} align="stretch" w="100%">
          <Box>
            {LinkItems.map((link) => (
              <NavItem key={link.name} icon={link.icon} route={link.route}>
                {link.name}
              </NavItem>
            ))}
            <Heading
              mt="6"
              p="4"
              mx="4"
              size={'xs'}
              textTransform="uppercase"
              textColor={useColorModeValue('gray.500', 'gray.100')}
              fontWeight="medium"
            >
              Links
            </Heading>
            {RefLinkItems.map((link) => (
              <NavItem
                key={link.name}
                icon={link.icon}
                route={link.route}
                isBlank={link.isBlank}
              >
                {link.name}
              </NavItem>
            ))}
          </Box>
        </VStack>
      </Box>
    </Box>
  )
}

interface NavItemProps extends FlexProps {
  icon: IconType
  children: string | number
  route: string
  isBlank?: boolean
}
export const NavItem = ({
  icon,
  children,
  route,
  isBlank,
  ...rest
}: NavItemProps) => {
  const router = useRouter()
  const [isSelected, setIsSelected] = useState(false)
  const selectedColor = 'sidebar-selected' // Using the theme token

  useEffect(() => {
    if (route === '/') {
      setIsSelected(router.route === route)
    } else {
      setIsSelected(router.route.includes(route))
    }
  }, [router])

  return (
    <Link
      as={NextLink}
      href={route}
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
      target={isBlank ? '_blank' : '_self'}
    >
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        bg={
          isSelected
            ? useColorModeValue('light-theme', 'dark-theme')
            : 'transparent'
        }
        color={
          isSelected
            ? useColorModeValue('white', 'black')
            : useColorModeValue('black', 'white')
        }
        _hover={{
          bg: 'button-hover',
          color: 'black', // Matching the button hover text color
        }}
        {...rest}
      >
        {icon && (
          <Icon
            mr="4"
            fontSize="16"
            _groupHover={{
              color: isSelected
                ? selectedColor
                : useColorModeValue('light-theme', 'dark-theme'),
            }}
            as={icon}
          />
        )}
        {children}
      </Flex>
    </Link>
  )
}

interface MobileProps extends FlexProps {
  onOpen: () => void
}
const MobileNav = ({ onOpen, ...rest }: MobileProps) => {
  return (
    <Flex
      ml={{ base: 0, md: 60 }}
      px={{ base: 4, md: 24 }}
      height="20"
      alignItems="center"
      bg={useColorModeValue('light-container', 'dark-container')}
      borderBottomWidth="1px"
      borderBottomColor={useColorModeValue('gray.200', 'gray.700')}
      justifyContent="flex-start"
      {...rest}
    >
      <IconButton
        variant="outline"
        onClick={onOpen}
        aria-label="open menu"
        icon={<FiMenu />}
      />

      <Text fontSize="2xl" ml="8" fontFamily="monospace" fontWeight="bold">
        Tellor Explorer
      </Text>
    </Flex>
  )
}
