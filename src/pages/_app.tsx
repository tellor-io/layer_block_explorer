import '@/styles/globals.css'
import '../styles/fonts.css?v=1'
import type { AppProps } from 'next/app'
import { ChakraProvider } from '@chakra-ui/react'
import Layout from '@/components/Layout'
import theme, { ppNeueMontreal } from '@/theme'
import { wrapper } from '@/store'
import { Provider } from 'react-redux'
import { ReactNode } from 'react'

function App({
  Component,
  pageProps,
}: AppProps & { Component: { children?: ReactNode } }) {
  const { store, props } = wrapper.useWrappedStore(pageProps)
  return (
    <ChakraProvider theme={theme}>
      <Provider store={store}>
        <main
          className={ppNeueMontreal.variable}
          style={{ fontFamily: 'var(--font-pp-neue-montreal), sans-serif' }}
        >
          <Layout>
            <Component {...props} />
          </Layout>
        </main>
      </Provider>
    </ChakraProvider>
  )
}

export default App
