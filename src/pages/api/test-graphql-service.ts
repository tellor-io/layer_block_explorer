import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Disable GraphQL testing on server side
  return res.status(503).json({
    error: 'GraphQL service testing is disabled on server side',
    message: 'GraphQL can only be used on the client side. Use RPC endpoints instead.',
    timestamp: new Date().toISOString(),
  })
}
