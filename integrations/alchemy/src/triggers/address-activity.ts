import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let addressActivity = SlateTrigger.create(spec, {
  name: 'Address Activity',
  key: 'address_activity',
  description:
    'Fires when a tracked address sends or receives ETH, ERC-20, ERC-721, or ERC-1155 tokens. Tracks all transfer activity for monitored addresses.'
})
  .input(
    z.object({
      webhookId: z.string().describe('Alchemy webhook ID'),
      eventId: z.string().describe('Unique event identifier'),
      network: z.string().describe('Network where the activity occurred'),
      activity: z
        .array(
          z.object({
            fromAddress: z.string().describe('Sender address'),
            toAddress: z.string().describe('Receiver address'),
            blockNum: z.string().describe('Block number in hex'),
            transactionHash: z.string().describe('Transaction hash'),
            value: z.number().optional().describe('Transfer value'),
            asset: z.string().optional().describe('Asset name (e.g., ETH, USDC)'),
            category: z
              .string()
              .describe('Transfer category (external, internal, erc20, erc721, erc1155)'),
            rawContract: z
              .object({
                rawValue: z.string().optional().describe('Raw value in hex'),
                address: z.string().optional().describe('Contract address'),
                decimals: z.number().optional().describe('Token decimals')
              })
              .optional()
              .describe('Raw contract details'),
            log: z
              .object({
                address: z.string().optional(),
                topics: z.array(z.string()).optional(),
                data: z.string().optional(),
                blockNumber: z.string().optional(),
                transactionHash: z.string().optional(),
                logIndex: z.string().optional()
              })
              .optional()
              .describe('Associated event log')
          })
        )
        .describe('Activity entries')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('Alchemy webhook ID'),
      network: z.string().describe('Network'),
      fromAddress: z.string().describe('Sender address'),
      toAddress: z.string().describe('Receiver address'),
      value: z.number().optional().describe('Transfer value'),
      asset: z.string().optional().describe('Asset name'),
      category: z.string().describe('Transfer category'),
      blockNum: z.string().describe('Block number'),
      transactionHash: z.string().describe('Transaction hash'),
      contractAddress: z.string().optional().describe('Token contract address')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AlchemyClient({
        token: ctx.auth.token,
        network: 'eth-mainnet'
      });

      let result = await client.createWebhook({
        webhookType: 'ADDRESS_ACTIVITY',
        webhookUrl: ctx.input.webhookBaseUrl,
        network: 'ETH_MAINNET',
        addresses: []
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
      let activities = data.event?.activity || [];

      let inputs = activities.map((activity: any, index: number) => ({
        webhookId,
        eventId: `${data.id || webhookId}-${activity.hash || activity.transactionHash || index}-${index}`,
        network,
        activity: [activity].map((a: any) => ({
          fromAddress: a.fromAddress,
          toAddress: a.toAddress,
          blockNum: a.blockNum,
          transactionHash: a.hash || a.transactionHash,
          value: a.value,
          asset: a.asset,
          category: a.category,
          rawContract: a.rawContract
            ? {
                rawValue: a.rawContract.rawValue,
                address: a.rawContract.address,
                decimals: a.rawContract.decimals
              }
            : undefined,
          log: a.log
            ? {
                address: a.log.address,
                topics: a.log.topics,
                data: a.log.data,
                blockNumber: a.log.blockNumber,
                transactionHash: a.log.transactionHash,
                logIndex: a.log.logIndex
              }
            : undefined
        }))
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let activity = ctx.input.activity[0];
      if (!activity) {
        return {
          type: 'address.activity',
          id: ctx.input.eventId,
          output: {
            webhookId: ctx.input.webhookId,
            network: ctx.input.network,
            fromAddress: '',
            toAddress: '',
            category: 'unknown',
            blockNum: '0x0',
            transactionHash: ''
          }
        };
      }

      return {
        type: `address.${activity.category}`,
        id: ctx.input.eventId,
        output: {
          webhookId: ctx.input.webhookId,
          network: ctx.input.network,
          fromAddress: activity.fromAddress,
          toAddress: activity.toAddress,
          value: activity.value,
          asset: activity.asset,
          category: activity.category,
          blockNum: activity.blockNum,
          transactionHash: activity.transactionHash,
          contractAddress: activity.rawContract?.address
        }
      };
    }
  })
  .build();
