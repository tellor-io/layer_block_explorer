import { Theme, extendTheme } from '@chakra-ui/react'
import localFont from 'next/font/local'
import { colors } from './colors'
import { components } from './components'

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

const theme: Theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  } as Theme['config'],
  fonts: {
    heading: `var(--font-pp-neue-montreal), monospace`,
    paragraph: `var(--font-pp-neue-montreal), monospace`,
    body: `var(--font-pp-neue-montreal), monospace`,
    mono: `var(--font-pp-neue-montreal), monospace`,
  },
  styles: {},
  colors,
  components,
}) as Theme

export { ppNeueMontreal, theme as default }
