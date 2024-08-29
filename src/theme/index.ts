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
    // Add other weights/styles if needed
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
      fontFamily: `var(--font-pp-neue-montreal), monospace`,
    },
    variants: {
      solid: (props: { colorMode: 'light' | 'dark' }) => ({
        bg: props.colorMode === 'dark' ? 'button-secondary' : 'button-primary',
        color: 'white',
        _hover: {
          bg: 'button-hover',
        },
        _active: {
          bg: 'button-active',
        },
      }),
    },
  },
}

const theme = extendTheme({
  config,
  fonts: {
    heading: `var(--font-pp-neue-montreal), monospace`,
    paragraph: `var(--font-pp-neue-montreal), monospace`,
    body: `var(--font-pp-neue-montreal), monospace`,
    mono: `var(--font-pp-neue-montreal), monospace`,
  },
  colors,
  components,
})

export { ppNeueMontreal, theme as default }
