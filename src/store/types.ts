import { Store } from '@reduxjs/toolkit'
import { ConnectState } from './connectSlice'
import { StreamState } from './streamSlice'
import { ParamsState } from './paramsSlice'

export interface AppState {
  connect: ConnectState
  stream: StreamState
  params: ParamsState
}

export type AppStore = Store<AppState>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
