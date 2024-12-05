import { configureStore } from '@reduxjs/toolkit'
import { createWrapper } from 'next-redux-wrapper'
import connectReducer from './connectSlice'
import streamReducer from './streamSlice'
import paramsReducer from './paramsSlice'
import { AppStore } from './types'

const makeStore = () =>
  configureStore({
    reducer: {
      connect: connectReducer,
      stream: streamReducer,
      params: paramsReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  })

export const wrapper = createWrapper<AppStore>(makeStore)
export type { AppState, RootState, AppDispatch } from './types'
