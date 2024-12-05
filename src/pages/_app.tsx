import '@/styles/globals.css'
import '../styles/fonts.css?v=1'
import type { AppProps } from 'next/app'
import { ChakraProvider, useColorModeValue } from '@chakra-ui/react'
import Layout from '@/components/Layout'
import theme, { ppNeueMontreal } from '@/theme'
import { wrapper } from '@/store'
import Head from 'next/head'

function App({ Component, ...rest }: AppProps) {
  const { store, props } = wrapper.useWrappedStore(rest)
  const { pageProps } = props

  return (
    <ChakraProvider theme={theme}>
      <Head>
        <link rel="icon" type="image/x-icon" href="/nuuu.ico" />
        <link rel="shortcut icon" type="image/x-icon" href="/nuuu.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/nuuu.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/nuuu.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/nuuu.ico" />
      </Head>
      <main
        className={ppNeueMontreal.variable}
        style={{
          fontFamily: 'var(--font-pp-neue-montreal), sans-serif',
          backgroundColor: useColorModeValue('light-bg', 'dark-bg'),
          minHeight: '100vh',
        }}
      >
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </main>
    </ChakraProvider>
  )
}

export default wrapper.withRedux(App)
