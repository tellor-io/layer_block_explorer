import { Colors } from '@chakra-ui/react'

/**
 * Tellor design system — pine / emerald / opal
 * Token names preserved so existing useColorModeValue calls keep working.
 */
export const colors: Colors = {
  // Surfaces
  'light-container': '#FFFFFF',
  'light-bg': '#EEFFFB',
  'light-theme': '#003734',
  'dark-container': '#003734',
  'dark-bg': '#001f1d',
  'dark-theme': '#EEFFFB',
  'page-bg': {
    light: '#EEFFFB',
    dark: '#001f1d',
  },

  // Buttons / accents
  'button-primary': '#003734',
  'button-secondary': '#08D482',
  'button-hover': '#B9D6D4',
  'button-active': '#81B1B0',
  'sidebar-selected': '#003734',
  'button-text': {
    light: '#EEFFFB',
    dark: '#003734',
  },

  // Brand scales (for direct use)
  pine: {
    50: '#EEFFFB',
    100: '#C3FFF5',
    200: '#88FFEC',
    300: '#45FFE1',
    400: '#0FF2D1',
    500: '#00D6B9',
    600: '#00AD98',
    700: '#00897B',
    800: '#036C63',
    900: '#074B45',
    950: '#003734',
  },
  emerald: {
    50: '#EEFFF7',
    100: '#D7FFEE',
    200: '#B2FFDF',
    300: '#76FFC7',
    400: '#33F5A7',
    500: '#08D482',
    600: '#00B96F',
    700: '#049159',
    800: '#0A7149',
    900: '#0A5D3E',
    950: '#003421',
  },
  opal: {
    50: '#F5F8F8',
    100: '#DCEBEA',
    200: '#B9D6D4',
    300: '#81B1B0',
    400: '#67999A',
    500: '#4D7D7F',
    600: '#3C6365',
    700: '#335052',
    800: '#2C4143',
    900: '#27393A',
    950: '#131E20',
  },
  border: {
    light: '#B9D6D4',
    soft: '#DCEBEA',
    dark: '#0A4A47',
    'dark-soft': '#073330',
  },
}
