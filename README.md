<div align="center">
  <h1 align="center">Tellor Block Explorer</h1>

  <p align="center">
     Blockchain Explorer for Tellor
    <br />
    <br />
    <a href="https://github.com/tellor-io/layer_block_explorer/issues">Report Issues</a>
    ·
    <a href="https://github.com/tellor-io/layer_block_explorer/issues">Request Feature</a>
  </p>

[![GitHub](https://img.shields.io/github/license/arifintahu/dexplorer.svg)](https://github.com/arifintahu/dexplorer/blob/main/LICENSE)
[![Dexplorer Deploy](https://vercelbadge.vercel.app/api/arifintahu/dexplorer)](https://github.com/arifintahu/dexplorer/deployments/activity_log)
[![Contributors](https://img.shields.io/github/contributors/arifintahu/dexplorer)](https://github.com/arifintahu/dexplorer/graphs/contributors)

</div>

`Tellor Block Explorer` is a light explorer for Tellor built on top of the [dexplorer] (https://github.com/arifintahu/dexplorer/)template.

## Features

- A dashboard to easily monitor chain activity
- The ability to subscribe to the latest blocks and transactions
- A search function that allows you to quickly find blocks, transactions, and accounts
- A list of active validators
- A list of proposals
- Blockchain parameters

## How is Dexplorer different from other explorers?

`Tellor Block Explorer` is only a frontend app, meaning there is no cache or pre-processing. It pulls data from RPC as needed.

## Network Configuration

Set network-specific RPC and GraphQL sources as comma-separated lists (first value is primary, later values are fallback):

- `NEXT_PUBLIC_MAINNET_RPC_ENDPOINTS`
- `NEXT_PUBLIC_PALMITO_RPC_ENDPOINTS`
- `NEXT_PUBLIC_MAINNET_GRAPHQL_ENDPOINTS`
- `NEXT_PUBLIC_PALMITO_GRAPHQL_ENDPOINTS`
- `NEXT_PUBLIC_MAINNET_GRAPHQL_USERNAME`
- `NEXT_PUBLIC_MAINNET_GRAPHQL_PASSWORD`
- `NEXT_PUBLIC_PALMITO_GRAPHQL_USERNAME`
- `NEXT_PUBLIC_PALMITO_GRAPHQL_PASSWORD`

Server-side routes also read non-public equivalents (without the `NEXT_PUBLIC_` prefix), but client-side GraphQL requires `NEXT_PUBLIC_` values.

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement". Don't forget to give the project a star! Thanks again!

1. Fork the project
2. Create your feature branch ~ `git checkout -b feature/feature-name`
3. Commit your changes ~ `git commit -m 'Add some feature-name'`
4. Push to the branch ~ `git push origin feature/feature-name`
5. Open a Pull Request to original repo branch `main`

## Contributors

[@arifintahu](https://github.com/arifintahu)
