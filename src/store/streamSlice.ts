import { createSlice, Action, PayloadAction } from '@reduxjs/toolkit'
import { AppState } from './index'
import { HYDRATE } from 'next-redux-wrapper'
import { NewBlockEvent, TxEvent } from '@cosmjs/tendermint-rpc'
import { Subscription } from 'xstream'

// Type for our state
export interface StreamState {
  newBlock: NewBlockEvent | null
  txEvent: TxEvent | null
  subsNewBlock: Subscription | null
  subsTxEvent: Subscription | null
  // GraphQL subscription state
  graphqlSubscriptions: {
    blocks: any | null
    transactions: any | null
    validators: any | null
    reporters: any | null
  }
  // GraphQL subscription status tracking
  subscriptionStatus: {
    blocks: 'connected' | 'disconnected' | 'error' | 'connecting'
    transactions: 'connected' | 'disconnected' | 'error' | 'connecting'
    validators: 'connected' | 'disconnected' | 'error' | 'connecting'
    reporters: 'connected' | 'disconnected' | 'error' | 'connecting'
  }
  // Subscription error tracking
  subscriptionErrors: {
    blocks: string | null
    transactions: string | null
    validators: string | null
    reporters: string | null
  }
  // Fallback polling state
  pollingState: {
    enabled: boolean
    intervals: {
      blocks: NodeJS.Timeout | null
      transactions: NodeJS.Timeout | null
      validators: NodeJS.Timeout | null
      reporters: NodeJS.Timeout | null
    }
  }
  dataSource: 'rpc' | 'graphql' | 'mixed'
}

// Initial state
const initialState: StreamState = {
  newBlock: null,
  txEvent: null,
  subsNewBlock: null,
  subsTxEvent: null,
  graphqlSubscriptions: {
    blocks: null,
    transactions: null,
    validators: null,
    reporters: null,
  },
  subscriptionStatus: {
    blocks: 'disconnected',
    transactions: 'disconnected',
    validators: 'disconnected',
    reporters: 'disconnected',
  },
  subscriptionErrors: {
    blocks: null,
    transactions: null,
    validators: null,
    reporters: null,
  },
  pollingState: {
    enabled: false,
    intervals: {
      blocks: null,
      transactions: null,
      validators: null,
      reporters: null,
    },
  },
  dataSource: 'rpc',
}

// Define a type for the HYDRATE action
type HydrateAction = Action<typeof HYDRATE> & {
  payload: AppState
}

// Actual Slice
export const streamSlice = createSlice({
  name: 'stream',
  initialState,
  reducers: {
    // Action to set the new block
    setNewBlock(state, action) {
      state.newBlock = action.payload
    },

    // Action to set the tx event
    setTxEvent(state, action) {
      state.txEvent = action.payload
    },

    // Action to set the subs state new block
    setSubsNewBlock(state, action) {
      state.subsNewBlock = action.payload
    },

    // Action to set the subs state tx event
    setSubsTxEvent(state, action) {
      state.subsTxEvent = action.payload
    },

    // GraphQL subscription actions
    setGraphQLSubscription(
      state,
      action: PayloadAction<{
        type: keyof StreamState['graphqlSubscriptions']
        data: any
      }>
    ) {
      const { type, data } = action.payload
      state.graphqlSubscriptions[type] = data
    },
    clearGraphQLSubscription(
      state,
      action: PayloadAction<keyof StreamState['graphqlSubscriptions']>
    ) {
      const type = action.payload
      state.graphqlSubscriptions[type] = null
    },
    setDataSource(state, action: PayloadAction<'rpc' | 'graphql' | 'mixed'>) {
      state.dataSource = action.payload
    },

    // GraphQL subscription status management
    setSubscriptionStatus(
      state,
      action: PayloadAction<{
        type: keyof StreamState['subscriptionStatus']
        status: StreamState['subscriptionStatus']['blocks']
      }>
    ) {
      const { type, status } = action.payload
      state.subscriptionStatus[type] = status
    },

    // Subscription error management
    setSubscriptionError(
      state,
      action: PayloadAction<{
        type: keyof StreamState['subscriptionErrors']
        error: string | null
      }>
    ) {
      const { type, error } = action.payload
      state.subscriptionErrors[type] = error
    },

    // Polling state management
    setPollingEnabled(state, action: PayloadAction<boolean>) {
      state.pollingState.enabled = action.payload
    },

    setPollingInterval(
      state,
      action: PayloadAction<{
        type: keyof StreamState['pollingState']['intervals']
        interval: NodeJS.Timeout | null
      }>
    ) {
      const { type, interval } = action.payload
      state.pollingState.intervals[type] = interval
    },

    // Clear all subscription errors
    clearAllSubscriptionErrors(state) {
      state.subscriptionErrors = {
        blocks: null,
        transactions: null,
        validators: null,
        reporters: null,
      }
    },

    // Reset all subscriptions
    resetAllSubscriptions(state) {
      state.graphqlSubscriptions = {
        blocks: null,
        transactions: null,
        validators: null,
        reporters: null,
      }
      state.subscriptionStatus = {
        blocks: 'disconnected',
        transactions: 'disconnected',
        validators: 'disconnected',
        reporters: 'disconnected',
      }
      state.subscriptionErrors = {
        blocks: null,
        transactions: null,
        validators: null,
        reporters: null,
      }
    },
  },

  // Special reducer for hydrating the state. Special case for next-redux-wrapper
  extraReducers: (builder) => {
    builder.addCase(HYDRATE, (state, action: HydrateAction) => {
      return {
        ...state,
        ...action.payload.stream,
      }
    })
  },
})

export const {
  setNewBlock,
  setTxEvent,
  setSubsNewBlock,
  setSubsTxEvent,
  setGraphQLSubscription,
  clearGraphQLSubscription,
  setDataSource,
  setSubscriptionStatus,
  setSubscriptionError,
  setPollingEnabled,
  setPollingInterval,
  clearAllSubscriptionErrors,
  resetAllSubscriptions,
} = streamSlice.actions

export const selectNewBlock = (state: AppState) => state.stream.newBlock
export const selectTxEvent = (state: AppState) => state.stream.txEvent

export const selectSubsNewBlock = (state: AppState) => state.stream.subsNewBlock
export const selectSubsTxEvent = (state: AppState) => state.stream.subsTxEvent
export const selectGraphQLSubscriptions = (state: AppState) =>
  state.stream.graphqlSubscriptions
export const selectDataSource = (state: AppState) => state.stream.dataSource

// New selectors for GraphQL subscription management
export const selectSubscriptionStatus = (state: AppState) =>
  state.stream.subscriptionStatus
export const selectSubscriptionErrors = (state: AppState) =>
  state.stream.subscriptionErrors
export const selectPollingState = (state: AppState) => state.stream.pollingState

// Derived selectors
export const selectAnySubscriptionConnected = (state: AppState) => {
  const status = state.stream.subscriptionStatus
  return Object.values(status).some((status) => status === 'connected')
}

export const selectAnySubscriptionError = (state: AppState) => {
  const errors = state.stream.subscriptionErrors
  return Object.values(errors).some((error) => error !== null)
}

export const selectSubscriptionHealth = (state: AppState) => {
  const status = state.stream.subscriptionStatus
  const errors = state.stream.subscriptionErrors
  const connected = Object.values(status).filter(
    (s) => s === 'connected'
  ).length
  const total = Object.keys(status).length
  const hasErrors = Object.values(errors).some((error) => error !== null)

  return {
    connectedCount: connected,
    totalCount: total,
    healthPercentage: total > 0 ? (connected / total) * 100 : 0,
    hasErrors,
    isHealthy: connected > 0 && !hasErrors,
  }
}

export default streamSlice.reducer
