import { Theme, extendTheme } from '@chakra-ui/react'
import { colors } from './colors'
import { components } from './components'

const theme: Theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  } as Theme['config'],
  fonts: {
    heading: '"IBM Plex Mono", monospace',
    paragraph: '"IBM Plex Mono", monospace',
    body: '"IBM Plex Mono", monospace',
    mono: '"IBM Plex Mono", monospace',
  },
  styles: {},
  colors,
  components,
}) as Theme

export default theme
