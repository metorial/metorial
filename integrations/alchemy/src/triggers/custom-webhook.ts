import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let customWebhook = SlateTrigger.create(spec, {
  name: 'Custom Webhook',
  key: 'custom_webhook',
  description:
    'Receives custom webhook events from Alchemy using GraphQL filters. Tracks any smart contract interaction, marketplace activity, or contract creation based on custom-defined filters.'
})
  .input(
    z.object({
      webhookId: z.string().describe('Alchemy webhook ID'),
      eventId: z.string().describe('Unique event identifier'),
      eventType: z.string().describe('Type of the event'),
      eventData: z.any().describe('Raw event data from the webhook payload')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('Alchemy webhook ID'),
      transactionHash: z.string().optional().describe('Transaction hash if applicable'),
      blockNumber: z.string().optional().describe('Block number if applicable'),
      fromAddress: z.string().optional().describe('From address if applicable'),
      toAddress: z.string().optional().describe('To address if applicable'),
      logs: z
        .array(
          z.object({
            contractAddress: z.string().optional(),
            topics: z.array(z.string()).optional(),
            logData: z.string().optional()
          })
        )
        .optional()
        .describe('Event logs'),
      rawEvent: z.any().describe('Full raw event data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AlchemyClient({
        token: ctx.auth.token,
        network: 'eth-mainnet'
      });

      let result = await client.createWebhook({
        webhookType: 'GRAPHQL',
        webhookUrl: ctx.input.webhookBaseUrl,
        network: 'ETH_MAINNET'
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
      let event = data.event || {};

      // Custom webhooks can have various shapes depending on the GraphQL query
      let transactions = event.data?.block?.transactions || [];

      if (transactions.length === 0) {
        // Single event format
        return {
          inputs: [
            {
              webhookId,
              eventId: `${data.id || webhookId}-${data.createdAt || Date.now()}`,
              eventType: 'custom',
              eventData: event
            }
          ]
        };
      }

      // Multiple transactions format
      let inputs = transactions.map((tx: any, index: number) => ({
        webhookId,
        eventId: `${data.id || webhookId}-${tx.hash || index}-${index}`,
        eventType: 'custom.transaction',
        eventData: {
          ...tx,
          blockNumber: event.data?.block?.number,
          blockTimestamp: event.data?.block?.timestamp
        }
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventData = ctx.input.eventData || {};

      let logs = (eventData.logs || []).map((log: any) => ({
        contractAddress: log.account?.address || log.address,
        topics: log.topics?.map((t: any) => t.hash || t) || [],
        logData: log.data
      }));

      return {
        type: `custom.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          webhookId: ctx.input.webhookId,
          transactionHash: eventData.hash,
          blockNumber: eventData.blockNumber ? String(eventData.blockNumber) : undefined,
          fromAddress: eventData.from?.address || eventData.from,
          toAddress: eventData.to?.address || eventData.to,
          logs,
          rawEvent: eventData
        }
      };
    }
  })
  .build();
