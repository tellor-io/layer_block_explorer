import { Tendermint37Client } from '@cosmjs/tendermint-rpc'
import { QueryClient } from '@cosmjs/stargate'
import {
  QueryVotesRequest,
  QueryVotesResponse,
  QueryProposalsRequest,
  QueryProposalsResponse,
  QueryProposalRequest,
  QueryProposalResponse,
} from 'cosmjs-types/cosmos/gov/v1beta1/query'
import {
  QueryValidatorsRequest,
  QueryValidatorsResponse,
  QueryParamsRequest as QueryStakingParamsRequest,
  QueryParamsResponse as QueryStakingParamsResponse,
} from 'cosmjs-types/cosmos/staking/v1beta1/query'
import {
  QueryParamsRequest as QuerySlashingParamsRequest,
  QueryParamsResponse as QuerySlashingParamsResponse,
} from 'cosmjs-types/cosmos/slashing/v1beta1/query'
import {
  QueryParamsRequest as QueryMintParamsRequest,
  QueryParamsResponse as QueryMintParamsResponse,
} from 'cosmjs-types/cosmos/mint/v1beta1/query'
import {
  QueryParamsRequest as QueryGovParamsRequest,
  QueryParamsResponse as QueryGovParamsResponse,
} from 'cosmjs-types/cosmos/gov/v1beta1/query'
import {
  QueryParamsRequest as QueryDistributionParamsRequest,
  QueryParamsResponse as QueryDistributionParamsResponse,
} from 'cosmjs-types/cosmos/distribution/v1beta1/query'
import { Vote, VoteOption } from 'cosmjs-types/cosmos/gov/v1beta1/gov'
import { PageRequest } from 'cosmjs-types/cosmos/base/query/v1beta1/pagination'
import Long from 'long'
import axios from 'axios'
import { RPCManager } from '../../utils/rpcManager'

export async function queryAllValidators(
  tmClient: Tendermint37Client
): Promise<QueryValidatorsResponse> {
  const queryClient = new QueryClient(tmClient)
  const req = QueryValidatorsRequest.encode({
    status: '', // Use an empty string to query all validators
    pagination: PageRequest.fromJSON({
      limit: 1000, // Set a high limit to get all validators
      countTotal: true,
    }),
  }).finish()
  const { value } = await queryClient.queryAbci(
    '/cosmos.staking.v1beta1.Query/Validators',
    req
  )
  const response = QueryValidatorsResponse.decode(value)
  return response
}

export async function queryProposals(
  tmClient: Tendermint37Client,
  page: number,
  perPage: number
): Promise<QueryProposalsResponse> {
  const queryClient = new QueryClient(tmClient)
  const proposalsRequest = QueryProposalsRequest.fromPartial({
    pagination: PageRequest.fromJSON({
      offset: page * perPage,
      limit: perPage,
      countTotal: true,
      reverse: true,
    }),
  })
  const req = QueryProposalsRequest.encode(proposalsRequest).finish()
  const { value } = await queryClient.queryAbci(
    '/cosmos.gov.v1beta1.Query/Proposals',
    req
  )
  return QueryProposalsResponse.decode(value)
}

export async function queryStakingParams(
  tmClient: Tendermint37Client
): Promise<QueryStakingParamsResponse> {
  const queryClient = new QueryClient(tmClient)
  const req = QueryStakingParamsRequest.encode({}).finish()
  const { value } = await queryClient.queryAbci(
    '/cosmos.staking.v1beta1.Query/Params',
    req
  )
  return QueryStakingParamsResponse.decode(value)
}

export async function querySlashingParams(
  tmClient: Tendermint37Client
): Promise<QuerySlashingParamsResponse> {
  const queryClient = new QueryClient(tmClient)
  const req = QuerySlashingParamsRequest.encode({}).finish()
  const { value } = await queryClient.queryAbci(
    '/cosmos.slashing.v1beta1.Query/Params',
    req
  )
  return QuerySlashingParamsResponse.decode(value)
}

export async function queryMintParams(
  tmClient: Tendermint37Client
): Promise<QueryMintParamsResponse> {
  const queryClient = new QueryClient(tmClient)
  const req = QueryMintParamsRequest.encode({}).finish()
  const { value } = await queryClient.queryAbci(
    '/cosmos.mint.v1beta1.Query/Params',
    req
  )
  return QueryMintParamsResponse.decode(value)
}

export async function queryGovParams(
  tmClient: Tendermint37Client,
  paramsType: string
): Promise<QueryGovParamsResponse> {
  const queryClient = new QueryClient(tmClient)
  const req = QueryGovParamsRequest.encode({
    paramsType: paramsType,
  }).finish()
  const { value } = await queryClient.queryAbci(
    '/cosmos.gov.v1beta1.Query/Params',
    req
  )
  return QueryGovParamsResponse.decode(value)
}

export async function queryDistributionParams(
  tmClient: Tendermint37Client
): Promise<QueryDistributionParamsResponse> {
  const queryClient = new QueryClient(tmClient)
  const req = QueryDistributionParamsRequest.encode({}).finish()
  const { value } = await queryClient.queryAbci(
    '/cosmos.distribution.v1beta1.Query/Params',
    req
  )
  return QueryDistributionParamsResponse.decode(value)
}

export async function queryProposalVotes(
  tmClient: Tendermint37Client,
  proposalId: number
) {
  try {
    // Use REST API instead of ABCI query for better compatibility
    const rpcManager = RPCManager.getInstance()
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await axios.get(
      `${baseEndpoint}/cosmos/gov/v1/proposals/${proposalId}`
    )

    if (!response.data?.proposal) {
      return { hasVotes: false, voteDistribution: null, totalPower: 0 }
    }

    const proposal = response.data.proposal
    const isVotingPeriod = proposal.status === 'PROPOSAL_STATUS_VOTING_PERIOD'

    let yes = '0'
    let no = '0'
    let abstain = '0'
    let noWithVeto = '0'

    if (isVotingPeriod) {
      // For active voting period, fetch individual votes and calculate tally
      try {
        const votesResponse = await axios.get(
          `${baseEndpoint}/cosmos/gov/v1/proposals/${proposalId}/votes`
        )
        
        if (votesResponse.data?.votes) {
          const votes = votesResponse.data.votes
          let yesCount = 0
          let noCount = 0
          let abstainCount = 0
          let noWithVetoCount = 0

          votes.forEach((vote: any) => {
            vote.options.forEach((option: any) => {
              const weight = parseFloat(option.weight)
              switch (option.option) {
                case 'VOTE_OPTION_YES':
                  yesCount += weight
                  break
                case 'VOTE_OPTION_NO':
                  noCount += weight
                  break
                case 'VOTE_OPTION_ABSTAIN':
                  abstainCount += weight
                  break
                case 'VOTE_OPTION_NO_WITH_VETO':
                  noWithVetoCount += weight
                  break
              }
            })
          })

          // Convert to the same format as final_tally_result (multiply by 1_000_000)
          yes = (yesCount * 1_000_000).toString()
          no = (noCount * 1_000_000).toString()
          abstain = (abstainCount * 1_000_000).toString()
          noWithVeto = (noWithVetoCount * 1_000_000).toString()
        }
      } catch (votesError) {
        console.warn('Failed to fetch individual votes, using final_tally_result:', votesError)
        // Fall back to final_tally_result if votes endpoint fails
        const tallyResult = proposal.final_tally_result
        if (tallyResult) {
          yes = tallyResult.yes_count || tallyResult.yes || '0'
          no = tallyResult.no_count || tallyResult.no || '0'
          abstain = tallyResult.abstain_count || tallyResult.abstain || '0'
          noWithVeto = tallyResult.no_with_veto_count || tallyResult.no_with_veto || '0'
        }
      }
    } else {
      // For completed proposals, use final_tally_result
      const tallyResult = proposal.final_tally_result
      if (tallyResult) {
        yes = tallyResult.yes_count || tallyResult.yes || '0'
        no = tallyResult.no_count || tallyResult.no || '0'
        abstain = tallyResult.abstain_count || tallyResult.abstain || '0'
        noWithVeto = tallyResult.no_with_veto_count || tallyResult.no_with_veto || '0'
      }
    }

    const totalPower = Number(yes) + Number(no) + Number(abstain) + Number(noWithVeto)

    const formatVote = (vote: string) => {
      const voteNumber = Number(vote) / 1_000_000
      const percentage =
        totalPower > 0 ? (voteNumber / (totalPower / 1_000_000)) * 100 : 0
      return {
        value: voteNumber,
        percentage: (Math.floor(percentage * 100) / 100).toFixed(2),
      }
    }

    return {
      hasVotes: totalPower > 0,
      voteDistribution: {
        yes: formatVote(yes),
        no: formatVote(no),
        abstain: formatVote(abstain),
        veto: formatVote(noWithVeto),
      },
      totalPower: totalPower / 1_000_000,
    }
  } catch (error) {
    console.error('Error querying proposal votes:', error)
    return { hasVotes: false, voteDistribution: null, totalPower: 0 }
  }
}

export async function getOracleParams(endpoint?: string): Promise<any> {
  try {
    const rpcManager = RPCManager.getInstance()
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await axios.get(`${baseEndpoint}/layer/oracle/params`)
    return response.data.params
  } catch (error) {
    console.error('Error in getOracleParams:', error)
    return undefined
  }
}

export async function queryRegistryParams(
  tmClient: Tendermint37Client
): Promise<any> {
  try {
    const rpcManager = RPCManager.getInstance()
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await axios.get(`${baseEndpoint}/layer/registry/params`)
    return response.data.params
  } catch (error) {
    console.error('Registry params query error:', error)
    throw error
  }
}

export async function queryDisputeParams(
  tmClient: Tendermint37Client
): Promise<any> {
  try {
    const rpcManager = RPCManager.getInstance()
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await axios.get(
      `${baseEndpoint}/tellor-io/layer/dispute/params`
    )
    return response.data.params
  } catch (error) {
    console.error('Dispute params query error:', error)
    throw error
  }
}

export async function queryReporterParams(
  tmClient: Tendermint37Client
): Promise<any> {
  try {
    const rpcManager = RPCManager.getInstance()
    const endpoint = await rpcManager.getCurrentEndpoint()
    const baseEndpoint = endpoint.replace('/rpc', '')

    const response = await axios.get(
      `${baseEndpoint}/tellor-io/layer/reporter/params`
    )
    return response.data.params
  } catch (error) {
    console.error('Reporter params query error:', error)
    throw error
  }
}
