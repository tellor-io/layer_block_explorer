import { Theme, extendTheme } from '@chakra-ui/react'
import { colors } from './colors'
import { components } from './components'

const theme: Theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  } as Theme['config'],
  fonts: {
    heading: '"PPNeueMontreal-Medium", monospace',
    paragraph: '"PPNeueMontreal-Medium", monospace',
    body: '"PPNeueMontreal-Medium", monospace',
    mono: '"PPNeueMontreal-Medium", monospace',
  },
  styles: {},
  colors,
  components,
}) as Theme

export default theme
