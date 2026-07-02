import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let nftActivity = SlateTrigger.create(spec, {
  name: 'NFT Activity',
  key: 'nft_activity',
  description:
    'Fires when ERC-721 or ERC-1155 NFTs matching configured filters are transferred between addresses. Tracks NFT mints, transfers, and burns.'
})
  .input(
    z.object({
      webhookId: z.string().describe('Alchemy webhook ID'),
      eventId: z.string().describe('Unique event identifier'),
      network: z.string().describe('Network where the activity occurred'),
      nftTransfer: z
        .object({
          fromAddress: z.string().describe('Sender address'),
          toAddress: z.string().describe('Receiver address'),
          contractAddress: z.string().describe('NFT contract address'),
          tokenId: z.string().describe('Token ID'),
          transactionHash: z.string().describe('Transaction hash'),
          blockNumber: z.string().describe('Block number'),
          erc1155Metadata: z
            .array(
              z.object({
                tokenId: z.string().optional(),
                value: z.string().optional()
              })
            )
            .optional()
            .describe('ERC-1155 specific metadata')
        })
        .describe('NFT transfer details')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('Alchemy webhook ID'),
      network: z.string().describe('Network'),
      fromAddress: z.string().describe('Sender address (0x0...0 for mints)'),
      toAddress: z.string().describe('Receiver address (0x0...0 for burns)'),
      contractAddress: z.string().describe('NFT contract address'),
      tokenId: z.string().describe('Token ID'),
      transactionHash: z.string().describe('Transaction hash'),
      blockNumber: z.string().describe('Block number'),
      transferType: z.string().describe('Transfer type: mint, burn, or transfer')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AlchemyClient({
        token: ctx.auth.token,
        network: 'eth-mainnet'
      });

      let result = await client.createWebhook({
        webhookType: 'NFT_ACTIVITY',
        webhookUrl: ctx.input.webhookBaseUrl,
        network: 'ETH_MAINNET',
        nftFilters: []
      });

      return {
        registrationDetails: {
          webhookId: result.data?.id || result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AlchemyClient({
        token: ctx.auth.token,
        network: 'eth-mainnet'
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let webhookId = data.webhookId || '';
      let network = data.event?.network || '';
      let nftActivities = data.event?.activity || [];

      let inputs = nftActivities.map((activity: any, index: number) => ({
        webhookId,
        eventId: `${data.id || webhookId}-${activity.transactionHash || index}-${activity.tokenId || index}-${index}`,
        network,
        nftTransfer: {
          fromAddress: activity.fromAddress,
          toAddress: activity.toAddress,
          contractAddress: activity.contractAddress,
          tokenId: activity.tokenId || '',
          transactionHash: activity.transactionHash || activity.hash,
          blockNumber: activity.blockNum || activity.blockNumber,
          erc1155Metadata: activity.erc1155Metadata
        }
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let transfer = ctx.input.nftTransfer;
      let zeroAddress = '0x0000000000000000000000000000000000000000';
      let transferType = 'transfer';
      if (transfer.fromAddress.toLowerCase() === zeroAddress) {
        transferType = 'mint';
      } else if (transfer.toAddress.toLowerCase() === zeroAddress) {
        transferType = 'burn';
      }

      return {
        type: `nft.${transferType}`,
        id: ctx.input.eventId,
        output: {
          webhookId: ctx.input.webhookId,
          network: ctx.input.network,
          fromAddress: transfer.fromAddress,
          toAddress: transfer.toAddress,
          contractAddress: transfer.contractAddress,
          tokenId: transfer.tokenId,
          transactionHash: transfer.transactionHash,
          blockNumber: transfer.blockNumber,
          transferType
        }
      };
    }
  })
  .build();
