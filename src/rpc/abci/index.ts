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
  console.log('Fetched validators:', response.validators)
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
  console.log(`Querying proposal ${proposalId}`)
  const queryClient = new QueryClient(tmClient)

  const proposalPath = `/cosmos.gov.v1beta1.Query/Proposal`
  const proposalRequest = QueryProposalRequest.encode({
    proposalId: Long.fromNumber(proposalId),
  }).finish()

  const { value: proposalValue } = await queryClient.queryAbci(
    proposalPath,
    proposalRequest
  )
  const proposalResponse = QueryProposalResponse.decode(proposalValue)

  if (!proposalResponse.proposal) {
    console.log(`No proposal found for ID ${proposalId}`)
    return { hasVotes: false, voteDistribution: null, totalPower: 0 }
  }

  const { yes, no, abstain, noWithVeto } =
    proposalResponse.proposal.finalTallyResult || {}
  const totalPower =
    Number(yes) + Number(no) + Number(abstain) + Number(noWithVeto)

  const formatVote = (vote: string | undefined) => {
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
}
