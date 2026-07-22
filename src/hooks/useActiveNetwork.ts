import { useSyncExternalStore } from 'react'
import { getDefaultNetwork, LayerNetwork } from '@/utils/constant'
import { rpcManager } from '@/utils/rpcManager'

/** Reactive active Layer network (mainnet | palmito). */
export function useActiveNetwork(): LayerNetwork {
  return useSyncExternalStore(
    (onStoreChange) => rpcManager.subscribe(onStoreChange),
    () => rpcManager.getActiveNetwork(),
    () => getDefaultNetwork()
  )
}

/** True while a network switch soft-refresh is in progress. */
export function useIsNetworkSwitching(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => rpcManager.subscribeSwitching(onStoreChange),
    () => rpcManager.getIsNetworkSwitching(),
    () => false
  )
}
