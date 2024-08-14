import '@/styles/globals.css'
import '../styles/fonts.css?v=1'
import type { AppProps } from 'next/app'
import { ChakraProvider } from '@chakra-ui/react'
import Layout from '@/components/Layout'
import theme, { ppNeueMontreal } from '@/theme'
import { wrapper } from '@/store'

function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <main className={ppNeueMontreal.variable}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </main>
    </ChakraProvider>
  )
}

export default wrapper.withRedux(App)
