import React, { ReactNode, useEffect, useState, useRef } from 'react'
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
  HStack,
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
  FiChevronDown,
} from 'react-icons/fi'
import { IconType } from 'react-icons'
import { RiBearSmileFill, RiBankLine, RiArrowRightSLine } from 'react-icons/ri'
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
import { SiRelay } from 'react-icons/si'

interface LinkItemProps {
  name: string
  icon: IconType
  route: string
  isBlank?: boolean
  leadingIcon?: IconType
  flipLeadingIcon?: boolean
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
  {
    name: 'Bridge Deposits',
    icon: FaBridge,
    leadingIcon: RiArrowRightSLine,
    route: '/bridge-deposits',
  },
  {
    name: 'Bridge Withdrawals',
    icon: FaBridge,
    leadingIcon: RiArrowRightSLine,
    flipLeadingIcon: true,
    route: '/bridge-withdrawals',
  },
]
export const RefLinkItems: Array<LinkItemProps> = [
  {
    name: 'Feeds Site',
    icon: SiRelay,
    route: 'https://feeds.tellor.io/',
    isBlank: true,
  },
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
    <Box minH="100vh" bg={useColorModeValue('light-bg', 'dark-bg')}>
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
  const [showScrollIndicator, setShowScrollIndicator] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkScrollable = () => {
      if (scrollRef.current) {
        const { scrollHeight, clientHeight } = scrollRef.current
        setShowScrollIndicator(scrollHeight > clientHeight)
      }
    }

    // Check after a short delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(checkScrollable, 100)
    window.addEventListener('resize', checkScrollable)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', checkScrollable)
    }
  }, [])

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5
      setShowScrollIndicator(!isAtBottom && scrollHeight > clientHeight)
    }
  }

  return (
    <Box
      ref={scrollRef}
      transition="3s ease"
      bg={useColorModeValue('light-bg', 'dark-bg')}
      borderRight="1px"
      borderRightColor={useColorModeValue('border.soft', 'border.dark-soft')}
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="100vh"
      overflowY="auto"
      onScroll={handleScroll}
      css={{
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          width: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: useColorModeValue('opal.200', 'border.dark'),
          borderRadius: '24px',
        },
      }}
      {...rest}
    >
      <Box flex="1" pt="24px" pb="80px" px="4" minH="min-content">
        <VStack spacing={1} align="stretch" w="100%">
          <Box>
            {LinkItems.map((link) => (
              <NavItem
                key={link.name}
                icon={link.icon}
                route={link.route}
                leadingIcon={link.leadingIcon}
                flipLeadingIcon={link.flipLeadingIcon}
              >
                {link.name}
              </NavItem>
            ))}
            <Heading
              mt="6"
              px="3"
              pb="1.5"
              size={'xs'}
              fontSize="11px"
              letterSpacing="0.12em"
              textTransform="uppercase"
              textColor={useColorModeValue('opal.500', '#6B928D')}
              fontWeight="500"
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

      {/* Scroll indicator arrow */}
      {showScrollIndicator && (
        <Box
          position="fixed"
          bottom="20px"
          left={{ base: 'calc(240px - 40px)', md: 'calc(240px - 40px)' }}
          bg={useColorModeValue('pine.950', 'emerald.500')}
          borderRadius="full"
          p="2"
          opacity="0.8"
          zIndex="1000"
          animation="bounce 2s infinite"
          css={{
            '@keyframes bounce': {
              '0%, 20%, 50%, 80%, 100%': {
                transform: 'translateY(0)',
              },
              '40%': {
                transform: 'translateY(-6px)',
              },
              '60%': {
                transform: 'translateY(-3px)',
              },
            },
          }}
        >
          <Icon
            as={FiChevronDown}
            color={useColorModeValue('pine.50', 'pine.950')}
            fontSize="16px"
          />
        </Box>
      )}
    </Box>
  )
}

interface NavItemProps extends FlexProps {
  icon: IconType
  children: string | number
  route: string
  isBlank?: boolean
  leadingIcon?: IconType
  flipLeadingIcon?: boolean
}
export const NavItem = ({
  icon,
  children,
  route,
  isBlank,
  leadingIcon,
  flipLeadingIcon,
  ...rest
}: NavItemProps) => {
  const router = useRouter()
  const [isSelected, setIsSelected] = useState(false)
  const activeBg = useColorModeValue('pine.950', 'emerald.500')
  const activeColor = useColorModeValue('pine.50', 'pine.950')
  const idleColor = useColorModeValue('pine.950', 'pine.50')
  const hoverBg = useColorModeValue('opal.100', 'rgba(255,255,255,0.04)')

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
        px="3"
        py="2.5"
        my="0.5"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        fontSize="13px"
        fontWeight={500}
        letterSpacing="0.01em"
        bg={isSelected ? activeBg : 'transparent'}
        color={isSelected ? activeColor : idleColor}
        _hover={{
          bg: isSelected ? activeBg : hoverBg,
          color: isSelected ? activeColor : idleColor,
        }}
        {...rest}
      >
        <HStack
          spacing={0}
          mr="3"
          align="center"
          justify="flex-start"
          w="28px"
          flexShrink={0}
        >
          {leadingIcon && (
            <Icon
              fontSize="14"
              as={leadingIcon}
              transform={flipLeadingIcon ? 'scaleX(-1)' : undefined}
              ml="-2px"
            />
          )}
          <Icon fontSize="16" as={icon} />
        </HStack>
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
      height="16"
      alignItems="center"
      bg={useColorModeValue('light-bg', 'dark-bg')}
      borderBottomWidth="1px"
      borderBottomColor={useColorModeValue('border.soft', 'border.dark-soft')}
      justifyContent="flex-start"
      {...rest}
    >
      <IconButton
        variant="outline"
        onClick={onOpen}
        aria-label="open menu"
        icon={<FiMenu />}
      />

      <Text
        fontSize="13px"
        ml="4"
        fontWeight={500}
        letterSpacing="0.04em"
        textTransform="lowercase"
        color={useColorModeValue('opal.700', '#8FB6B2')}
      >
        layer explorer
      </Text>
    </Flex>
  )
}
