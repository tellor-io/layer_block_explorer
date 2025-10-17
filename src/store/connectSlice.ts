import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit'
import { AppState } from './types'
import { HYDRATE } from 'next-redux-wrapper'
import { Tendermint37Client } from '@cosmjs/tendermint-rpc'

// Type for our state
export interface ConnectState {
  rpcAddress: string
  connectState: boolean
  tmClient: Tendermint37Client | null
  // GraphQL client state
  graphqlClient: any | null
  graphqlEndpoint: string
}

// Initial state
const initialState: ConnectState = {
  rpcAddress: '',
  connectState: false,
  tmClient: null,
  graphqlClient: null,
  graphqlEndpoint: '',
}

// Define a type for the HYDRATE action
type HydrateAction = Action<typeof HYDRATE> & {
  payload: AppState
}

// Actual Slice
export const connectSlice = createSlice({
  name: 'connect',
  initialState,
  reducers: {
    // Action to set the address
    setRPCAddress(state, action) {
      state.rpcAddress = action.payload
    },
    // Action to set the connection status
    setConnectState(state, action) {
      state.connectState = action.payload
    },
    // Action to set the client
    setTmClient(state, action) {
      state.tmClient = action.payload
    },
    // Action to reset state when switching RPC endpoints
    resetState(state) {
      state.tmClient = null
      state.connectState = false
      // Keep the rpcAddress as it will be set by setRPCAddress
    },

    // GraphQL client actions
    setGraphQLClient(state, action) {
      state.graphqlClient = action.payload
    },
    setGraphQLEndpoint(state, action) {
      state.graphqlEndpoint = action.payload
    },
    resetGraphQLState(state) {
      state.graphqlClient = null
      state.graphqlEndpoint = ''
    },
  },

  // Special reducer for hydrating the state. Special case for next-redux-wrapper
  extraReducers: (builder) => {
    builder.addCase(HYDRATE, (state, action: HydrateAction) => {
      return {
        ...state,
        ...action.payload.connect,
      }
    })
  },
})

export const {
  setRPCAddress,
  setConnectState,
  setTmClient,
  resetState,
  setGraphQLClient,
  setGraphQLEndpoint,
  resetGraphQLState,
} = connectSlice.actions

export const selectRPCAddress = (state: AppState) => state.connect.rpcAddress
export const selectConnectState = (state: AppState) =>
  state.connect.connectState
export const selectTmClient = (state: AppState) => state.connect.tmClient
export const selectGraphQLClient = (state: AppState) =>
  state.connect.graphqlClient
export const selectGraphQLEndpoint = (state: AppState) =>
  state.connect.graphqlEndpoint

export default connectSlice.reducer
