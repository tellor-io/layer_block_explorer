import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  const targetUrl =
    'https://tellorlayer.com/tellor-io/layer/oracle/current_cyclelist_query'

  try {
    const response = await fetch(targetUrl)

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Process the hex data to extract query parameters
    const decodedData = decodeQueryData(data.query_data)
    res.status(200).json([{ queryParams: decodedData.queryParams }])
  } catch (error) {
    console.error('API Route Error:', error)
    res.status(500).json({ error: 'Failed to fetch current cycle list' })
  }
}

function decodeQueryData(queryData: string): any {
  try {
    // Convert hex to ASCII
    const asciiData = Buffer.from(queryData, 'hex').toString('ascii')

    // Find the query type
    const spotPriceIndex = asciiData.indexOf('SpotPrice')

    if (spotPriceIndex !== -1) {
      const queryType = 'SpotPrice'

      // Extract only the last two 3-letter words
      const words = asciiData.match(/[a-z]{3}/g)
      if (!words || words.length < 2) {
        throw new Error('Failed to extract currency pairs from query data')
      }

      // Join the last two words with a '/' between them
      const queryParams = words.slice(-2).join('/')
      return { queryParams }
    }

    throw new Error('SpotPrice not found in query data')
  } catch (error) {
    console.error('Error decoding query data:', error)
    throw new Error('Failed to decode query data')
  }
}
