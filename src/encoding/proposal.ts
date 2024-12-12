import { TextProposal } from 'cosmjs-types/cosmos/gov/v1beta1/gov'

export const TYPE = {
  TextProposal: '/cosmos.gov.v1beta1.TextProposal',
  UpdateSnapshotLimit: '/layer.bridge.MsgUpdateSnapshotLimit',
  SoftwareUpgrade: '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade',
  MintInit: '/layer.mint.MsgInit',
  // Add other types as needed
}

export interface DecodeContentProposal {
  typeUrl: string
  data: TextProposal | null
}

export const decodeContentProposal = (
  typeUrl: string,
  value: Uint8Array
): DecodeContentProposal => {
  let data = null
  try {
    if (value && value.length > 0) {
      switch (typeUrl) {
        case TYPE.TextProposal:
          data = TextProposal.decode(value)
          break
        case TYPE.UpdateSnapshotLimit:
          return {
            typeUrl,
            data: {
              title: 'Update Snapshot Limit Proposal',
              description: 'Proposal to update snapshot limit',
            },
          }
        case TYPE.SoftwareUpgrade:
          return {
            typeUrl,
            data: {
              title: 'Software Upgrade Proposal',
              description: 'Proposal to upgrade the chain software',
            },
          }
        case TYPE.MintInit:
          return {
            typeUrl,
            data: {
              title: 'Mint Initialization Proposal',
              description: 'Proposal to initialize minting parameters',
            },
          }
        default:
          // Create a more user-friendly title from the type URL
          const proposalType =
            typeUrl.split('.').pop()?.replace('Msg', '') ?? 'Unknown'
          return {
            typeUrl,
            data: {
              title: `${proposalType} Proposal`,
              description: 'Custom proposal type',
            },
          }
      }
    }

    return {
      typeUrl,
      data,
    }
  } catch (error) {
    // Create a user-friendly title from the type URL on error
    const proposalType =
      typeUrl.split('.').pop()?.replace('Msg', '') ?? 'Unknown'
    return {
      typeUrl,
      data: {
        title: `${proposalType} Proposal`,
        description: 'Custom proposal type',
      },
    }
  }
}
