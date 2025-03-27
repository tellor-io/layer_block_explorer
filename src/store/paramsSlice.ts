import { createSlice } from '@reduxjs/toolkit'
import type { RootState } from './store'

const initialState = {
  oracle: null,
  registry: null,
  dispute: null,
  reporter: null,
  mint: null,
  staking: null,
  slashing: null,
  distribution: null,
  govVoting: null,
  govDeposit: null,
  govTally: null,
}

export const paramsSlice = createSlice({
  name: 'params',
  initialState,
  reducers: {
    setOracleParams: (state, action) => {
      state.oracle = action.payload
    },
    setRegistryParams: (state, action) => {
      state.registry = action.payload
    },
    setDisputeParams: (state, action) => {
      state.dispute = action.payload
    },
    setReporterParams: (state, action) => {
      state.reporter = action.payload
    },
    setMintParams: (state, action) => {
      state.mint = action.payload
    },
    setStakingParams: (state, action) => {
      state.staking = action.payload
    },
    setSlashingParams: (state, action) => {
      state.slashing = action.payload
    },
    setDistributionParams: (state, action) => {
      state.distribution = action.payload
    },
    setGovVotingParams: (state, action) => {
      state.govVoting = action.payload
    },
    setGovDepositParams: (state, action) => {
      state.govDeposit = action.payload
    },
    setGovTallyParams: (state, action) => {
      state.govTally = action.payload
    },
  },
})

export const {
  setOracleParams,
  setRegistryParams,
  setDisputeParams,
  setReporterParams,
  setMintParams,
  setStakingParams,
  setSlashingParams,
  setDistributionParams,
  setGovVotingParams,
  setGovDepositParams,
  setGovTallyParams,
} = paramsSlice.actions

export const selectOracleParams = (state: RootState) => state.params.oracle
export const selectRegistryParams = (state: RootState) => state.params.registry
export const selectDisputeParams = (state: RootState) => state.params.dispute
export const selectReporterParams = (state: RootState) => state.params.reporter
export const selectMintParams = (state: RootState) => state.params.mint
export const selectStakingParams = (state: RootState) => state.params.staking
export const selectSlashingParams = (state: RootState) => state.params.slashing
export const selectDistributionParams = (state: RootState) =>
  state.params.distribution
export const selectGovVotingParams = (state: RootState) =>
  state.params.govVoting
export const selectGovDepositParams = (state: RootState) =>
  state.params.govDeposit
export const selectGovTallyParams = (state: RootState) => state.params.govTally

export default paramsSlice.reducer
