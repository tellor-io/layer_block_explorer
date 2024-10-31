/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      issuer: { and: [/\.(js|ts|md)x?$/] },
      type: 'asset/resource',
    })
    return config
  },
  async rewrites() {
    return [
      {
        source: '/api/reporter-selectors/:reporter',
        destination: '/api/reporter-selectors/:reporter'
      },
      {
        source: '/api/current-cycle',
        destination: '/api/current-cycle'
      },
      {
        source: '/api/validators',
        destination: '/api/validators'
      }
    ]
  }
}

module.exports = nextConfig
