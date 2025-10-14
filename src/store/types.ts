import { Store } from '@reduxjs/toolkit'
import { ConnectState } from './connectSlice'
import { StreamState } from './streamSlice'
import { ParamsState } from './paramsSlice'
import { GraphQLState } from './graphqlSlice'

export interface AppState {
  connect: ConnectState
  stream: StreamState
  params: ParamsState
  graphql: GraphQLState
}

export type AppStore = Store<AppState>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
