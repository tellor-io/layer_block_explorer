import '@/styles/globals.css'
import '../styles/fonts.css?v=1'
import type { AppProps } from 'next/app'
import { ChakraProvider } from '@chakra-ui/react'
import Layout from '@/components/Layout'
import theme, { ppNeueMontreal } from '@/theme'
import { wrapper } from '@/store'
import { Provider } from 'react-redux'

function App({ Component, pageProps }: AppProps) {
  const { store, props } = wrapper.useWrappedStore(pageProps)
  return (
    <ChakraProvider theme={theme}>
      <Provider store={store}>
        <main className={ppNeueMontreal.variable}>
          <Layout>
            <Component {...props} />
          </Layout>
        </main>
      </Provider>
    </ChakraProvider>
  )
}

export default App
