import { extendTheme, ThemeConfig, ThemeComponents } from '@chakra-ui/react'
import localFont from 'next/font/local'
import { colors } from './colors'

const ppNeueMontreal = localFont({
  src: [
    {
      path: '../../public/fonts/PPNeueMontreal-Thin.woff2',
      weight: '100',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PPNeueMontreal-Book.woff2',
      weight: '400',
      style: 'normal',
    },
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
      fontWeight: 600,
      fontSize: '13px',
      borderRadius: 'full',
      transition: 'all 0.12s ease',
    },
    variants: {
      solid: (props: { colorMode: 'light' | 'dark' }) => ({
        bg: props.colorMode === 'dark' ? 'emerald.500' : 'pine.950',
        color: props.colorMode === 'dark' ? 'pine.950' : 'pine.50',
        _hover: {
          bg: props.colorMode === 'dark' ? 'emerald.400' : 'pine.900',
          _disabled: {
            bg: props.colorMode === 'dark' ? 'emerald.500' : 'pine.950',
          },
        },
        _active: {
          bg: props.colorMode === 'dark' ? 'emerald.600' : 'pine.800',
        },
      }),
      outline: (props: { colorMode: 'light' | 'dark' }) => ({
        bg: 'transparent',
        border: '1px solid',
        borderColor: props.colorMode === 'dark' ? 'border.dark' : 'border.light',
        color: props.colorMode === 'dark' ? 'pine.50' : 'pine.950',
        _hover: {
          bg: props.colorMode === 'dark' ? 'dark-container' : 'white',
        },
      }),
      ghost: (props: { colorMode: 'light' | 'dark' }) => ({
        color: props.colorMode === 'dark' ? 'pine.50' : 'pine.950',
        _hover: {
          bg: props.colorMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'opal.100',
        },
      }),
    },
  },
  IconButton: {
    baseStyle: {
      borderRadius: 'full',
    },
    variants: {
      solid: (props: { colorMode: 'light' | 'dark' }) => ({
        bg: props.colorMode === 'dark' ? 'dark-container' : 'white',
        border: '1px solid',
        borderColor: props.colorMode === 'dark' ? 'border.dark' : 'border.light',
        color: props.colorMode === 'dark' ? 'pine.50' : 'pine.950',
        _hover: {
          bg: props.colorMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'opal.100',
        },
      }),
      outline: (props: { colorMode: 'light' | 'dark' }) => ({
        bg: props.colorMode === 'dark' ? 'dark-container' : 'white',
        border: '1px solid',
        borderColor: props.colorMode === 'dark' ? 'border.dark' : 'border.light',
        color: props.colorMode === 'dark' ? 'pine.50' : 'pine.950',
        _hover: {
          bg: props.colorMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'opal.100',
        },
      }),
    },
    defaultProps: {
      variant: 'solid',
    },
  },
  Input: {
    variants: {
      outline: (props: { colorMode: 'light' | 'dark' }) => ({
        field: {
          borderRadius: 'full',
          bg: props.colorMode === 'dark' ? 'dark-container' : 'white',
          borderColor: props.colorMode === 'dark' ? 'border.dark' : 'border.light',
          fontSize: '13px',
          _hover: {
            borderColor:
              props.colorMode === 'dark' ? 'opal.500' : 'opal.300',
          },
          _focus: {
            borderColor: 'emerald.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-emerald-500)',
          },
          _placeholder: {
            color: props.colorMode === 'dark' ? '#6B928D' : 'opal.500',
          },
        },
      }),
    },
    defaultProps: {
      variant: 'outline',
    },
  },
  Table: {
    variants: {
      simple: (props: { colorMode: 'light' | 'dark' }) => ({
        th: {
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: props.colorMode === 'dark' ? '#8FB6B2' : 'opal.700',
          bg: props.colorMode === 'dark' ? '#002624' : 'pine.50',
          borderColor:
            props.colorMode === 'dark' ? 'border.dark-soft' : 'border.soft',
          borderBottom: '1px',
          borderBottomColor:
            props.colorMode === 'dark' ? 'border.dark-soft' : 'border.soft',
          py: 3,
          px: 5,
        },
        td: {
          fontSize: '13px',
          borderColor:
            props.colorMode === 'dark' ? 'border.dark-soft' : 'border.soft',
          borderBottom: '1px',
          borderBottomColor:
            props.colorMode === 'dark' ? 'border.dark-soft' : 'border.soft',
          py: 3,
          px: 5,
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
      color: props.colorMode === 'dark' ? 'emerald.300' : 'pine.950',
      _hover: {
        textDecoration: 'underline',
        color: props.colorMode === 'dark' ? 'emerald.400' : 'emerald.700',
      },
    }),
  },
  Heading: {
    baseStyle: {
      letterSpacing: '-0.015em',
      fontWeight: 700,
    },
  },
  Modal: {
    baseStyle: (props: { colorMode: 'light' | 'dark' }) => ({
      dialog: {
        bg: props.colorMode === 'dark' ? 'dark-container' : 'white',
        borderRadius: '2xl',
        border: '1px solid',
        borderColor: props.colorMode === 'dark' ? 'border.dark' : 'border.light',
      },
    }),
  },
  Drawer: {
    baseStyle: (props: { colorMode: 'light' | 'dark' }) => ({
      dialog: {
        bg: props.colorMode === 'dark' ? 'dark-bg' : 'light-bg',
      },
    }),
  },
  Tabs: {
    variants: {
      line: (props: { colorMode: 'light' | 'dark' }) => ({
        tab: {
          fontWeight: 500,
          fontSize: '13px',
          color: props.colorMode === 'dark' ? '#8FB6B2' : 'opal.700',
          _selected: {
            color: props.colorMode === 'dark' ? 'pine.50' : 'pine.950',
            fontWeight: 600,
            borderColor: 'emerald.500',
          },
        },
      }),
    },
  },
  Spinner: {
    baseStyle: {
      color: 'emerald.500',
    },
  },
}

const shadows = {
  // Soft border-like elevation (mocks favor borders over heavy shadows)
  base: '0 0 0 1px rgba(185, 214, 212, 0.85)',
  md: '0 4px 16px rgba(0, 55, 52, 0.08)',
  lg: '0 8px 28px rgba(0, 55, 52, 0.12)',
  glow: '0 0 24px rgba(8, 212, 130, 0.35)',
}

const radii = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
}

const theme = extendTheme({
  config,
  fonts: {
    heading: `var(--font-pp-neue-montreal), 'PP Neue Montreal', sans-serif`,
    body: `var(--font-pp-neue-montreal), 'PP Neue Montreal', sans-serif`,
    mono: `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`,
  },
  colors,
  shadows,
  radii,
  components,
  styles: {
    global: (props: { colorMode: 'light' | 'dark' }) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'page-bg.dark' : 'page-bg.light',
        color: props.colorMode === 'dark' ? 'pine.50' : 'pine.950',
        fontSize: '14px',
        lineHeight: 1.4,
      },
    }),
  },
})

export { ppNeueMontreal, theme as default }
