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
    setGraphQLSubscription(state, action: PayloadAction<{ type: keyof StreamState['graphqlSubscriptions']; data: any }>) {
      const { type, data } = action.payload
      state.graphqlSubscriptions[type] = data
    },
    clearGraphQLSubscription(state, action: PayloadAction<keyof StreamState['graphqlSubscriptions']>) {
      const type = action.payload
      state.graphqlSubscriptions[type] = null
    },
    setDataSource(state, action: PayloadAction<'rpc' | 'graphql' | 'mixed'>) {
      state.dataSource = action.payload
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
} = streamSlice.actions

export const selectNewBlock = (state: AppState) => state.stream.newBlock
export const selectTxEvent = (state: AppState) => state.stream.txEvent

export const selectSubsNewBlock = (state: AppState) => state.stream.subsNewBlock
export const selectSubsTxEvent = (state: AppState) => state.stream.subsTxEvent
export const selectGraphQLSubscriptions = (state: AppState) => state.stream.graphqlSubscriptions
export const selectDataSource = (state: AppState) => state.stream.dataSource

export default streamSlice.reducer
