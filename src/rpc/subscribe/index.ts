import {
  NewBlockEvent,
  Tendermint37Client,
  TxEvent,
} from '@cosmjs/tendermint-rpc'

let blockPollingInterval: NodeJS.Timeout | null = null
let txPollingInterval: NodeJS.Timeout | null = null
const POLLING_INTERVAL = 6000 // 6 seconds
const MAX_TXS_PER_BLOCK = 50 // Limit number of transactions to process per block

export function subscribeNewBlock(
  tmClient: Tendermint37Client,
  callback: (event: NewBlockEvent) => void
): { unsubscribe: () => void } {
  let lastHeight = 0

  // Clear any existing interval
  if (blockPollingInterval) {
    clearInterval(blockPollingInterval)
  }

  // Set up polling
  blockPollingInterval = setInterval(async () => {
    try {
      const status = await tmClient.status()
      const currentHeight = status.syncInfo.latestBlockHeight
      
      if (currentHeight > lastHeight) {
        const block = await tmClient.block(currentHeight)
        if (block) {
          // Create a NewBlockEvent object matching the structure used in blocks/index.tsx
          const event: NewBlockEvent = {
            header: block.block.header,
            txs: block.block.txs || [],
            lastCommit: block.block.lastCommit,
            evidence: block.block.evidence
          }
          callback(event)
          lastHeight = currentHeight
        }
      }
    } catch (error) {
      console.warn('Block polling error:', error)
    }
  }, POLLING_INTERVAL)

  return {
    unsubscribe: () => {
      if (blockPollingInterval) {
        clearInterval(blockPollingInterval)
        blockPollingInterval = null
      }
    },
  }
}

export function subscribeTx(
  tmClient: Tendermint37Client,
  callback: (event: TxEvent) => void
): { unsubscribe: () => void } {
  let lastHeight = 0

  // Clear any existing interval
  if (txPollingInterval) {
    clearInterval(txPollingInterval)
  }

  // Set up polling
  txPollingInterval = setInterval(async () => {
    try {
      const status = await tmClient.status()
      const currentHeight = status.syncInfo.latestBlockHeight
      
      if (currentHeight > lastHeight) {
        const block = await tmClient.block(currentHeight)
        if (block && block.block.txs.length > 0) {
          // Limit number of transactions to process
          const txsToProcess = block.block.txs.slice(0, MAX_TXS_PER_BLOCK)
          
          // Process transactions in parallel with error handling for each
          await Promise.all(
            txsToProcess.map(async (tx) => {
              try {
                const txResponse = await tmClient.tx({ hash: tx })
                if (txResponse) {
                  // Create a TxEvent object with all required properties
                  const event: TxEvent = {
                    hash: tx,
                    height: currentHeight,
                    result: txResponse.result,
                    tx: txResponse.tx // Add the tx property from the response
                  }
                  callback(event)
                }
              } catch (txError) {
                // Handle individual transaction errors without breaking the loop
                if (txError instanceof Error) {
                  // Only log if it's not a "tx not found" error
                  if (!txError.message.includes('not found') && 
                      !txError.message.includes('Internal error')) {
                    console.debug(
                      `Failed to fetch tx ${tx.slice(0, 10)}... at height ${currentHeight}:`,
                      txError.message
                    )
                  }
                }
              }
            })
          )
        }
        lastHeight = currentHeight
      }
    } catch (error) {
      // Only log serious errors, not transaction-related ones
      if (error instanceof Error && 
          !error.message.includes('tx not found') && 
          !error.message.includes('Internal error')) {
        console.warn('Transaction polling error:', error)
      }
    }
  }, POLLING_INTERVAL)

  return {
    unsubscribe: () => {
      if (txPollingInterval) {
        clearInterval(txPollingInterval)
        txPollingInterval = null
      }
    },
  }
}
