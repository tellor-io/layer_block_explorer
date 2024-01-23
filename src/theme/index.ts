import { Theme, extendTheme } from '@chakra-ui/react'
import { colors } from './colors'
import { components } from './components'

const theme: Theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  } as Theme['config'],
  fonts: {
    heading: 'Cascadia Code',
    paragraph: 'Cascadia Code',
    body: 'Cascadia Code',
    mono: 'IBM Plex Mono, Cascadia Code',
  },
  styles: {},
  colors,
  components,
}) as Theme

export default theme
