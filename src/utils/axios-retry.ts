import axios, { AxiosError, AxiosRequestConfig } from 'axios'

export const axiosWithRetry = async (
  config: AxiosRequestConfig,
  retries = 2
) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await axios(config)
    } catch (error) {
      if (i === retries) throw error

      const isTimeout =
        axios.isAxiosError(error) && error.code === 'ECONNABORTED'
      const is500 = axios.isAxiosError(error) && error.response?.status === 500

      // Only retry on timeouts and 500 errors
      if (!isTimeout && !is500) throw error

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
}
