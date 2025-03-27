// Define the Oracle parameter types based on your chain's actual structure
export interface OracleParams {
  oracle?: {
    votePeriod?: number
    voteThreshold?: string
    rewardBand?: string
    slashFraction?: string
    slashWindow?: number
  }
  registry?: {
    depositAmount?: string
    disputePeriod?: number
    voteThreshold?: string
  }
  dispute?: {
    votingPeriod?: number
    minDeposit?: string
    stakingAmount?: string
  }
  reporter?: {
    minStake?: string
    reportingPeriod?: number
    rewardAmount?: string
  }
}
