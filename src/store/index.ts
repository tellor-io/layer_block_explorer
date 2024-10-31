import { configureStore } from '@reduxjs/toolkit'
import { createWrapper } from 'next-redux-wrapper'
import connectReducer from './connectSlice'
import streamReducer from './streamSlice'
import paramsReducer from './paramsSlice'

export const makeStore = () =>
  configureStore({
    reducer: {
      connect: connectReducer,
      stream: streamReducer,
      params: paramsReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // Disable serializable check completely
      }),
    devTools: process.env.NODE_ENV !== 'production',
  })

export type AppStore = ReturnType<typeof makeStore>
export type AppState = ReturnType<AppStore['getState']>

export const wrapper = createWrapper<AppStore>(makeStore)
