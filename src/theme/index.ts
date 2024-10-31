import { extendTheme, ThemeConfig, ThemeComponents } from '@chakra-ui/react'
import localFont from 'next/font/local'
import { colors } from './colors'

const ppNeueMontreal = localFont({
  src: [
    {
      path: '../../public/fonts/PPNeueMontreal-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PPNeueMontreal-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-pp-neue-montreal',
})

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

const components: ThemeComponents = {
  Button: {
    baseStyle: {
      fontFamily: `var(--font-pp-neue-montreal), sans-serif`,
    },
    variants: {
      solid: (props: { colorMode: 'light' | 'dark' }) => ({
        bg: props.colorMode === 'dark' ? 'button-secondary' : 'button-primary',
        color: props.colorMode === 'dark' ? 'black' : 'white',
        _hover: {
          bg: 'button-hover',
        },
        _active: {
          bg: 'button-active',
        },
      }),
    },
  },
  Table: {
    variants: {
      simple: (props: { colorMode: 'light' | 'dark' }) => ({
        th: {
          borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
          borderBottom: '1px',
          borderBottomColor:
            props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
        },
        td: {
          borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
          borderBottom: '1px',
          borderBottomColor:
            props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
        },
        tbody: {
          tr: {
            '&:last-of-type': {
              td: {
                borderBottom: 'none',
              },
            },
          },
        },
      }),
    },
  },
  Link: {
    baseStyle: (props: { colorMode: 'light' | 'dark' }) => ({
      color: props.colorMode === 'dark' ? 'black' : 'light-theme',
      _hover: {
        textDecoration: 'underline',
        color: props.colorMode === 'dark' ? 'black' : '#00D27D',
      },
    }),
  },
}

type ColorModeProps = {
  colorMode: 'light' | 'dark'
}

const shadows = {
  base: '0px 0px 2px rgba(0, 0, 0, 0.9)',
  md: '0px 0px 15px rgba(0, 0, 0, 0.1)',
  lg: '0px 0px 20px rgba(0, 0, 0, 0.65)',
}

const theme = extendTheme({
  config,
  fonts: {
    heading: `var(--font-pp-neue-montreal), 'PP Neue Montreal', sans-serif`,
    body: `var(--font-pp-neue-montreal), 'PP Neue Montreal', sans-serif`,
    mono: `var(--font-pp-neue-montreal), 'PP Neue Montreal', monospace`,
  },
  colors,
  shadows,
  components,
})

export { ppNeueMontreal, theme as default }
