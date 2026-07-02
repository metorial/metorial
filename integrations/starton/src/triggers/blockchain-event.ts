import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let blockchainEvent = SlateTrigger.create(spec, {
  name: 'Blockchain Event',
  key: 'blockchain_event',
  description:
    'Triggers when a blockchain watcher detects an on-chain event such as address activity, token transfers, mints, approvals, or custom contract events.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      watcherId: z.string().describe('Watcher that triggered the event'),
      watcherType: z.string().describe('Type of watcher event'),
      network: z.string().describe('Blockchain network'),
      payload: z.any().describe('Raw event payload from the watcher')
    })
  )
  .output(
    z.object({
      watcherId: z.string().describe('ID of the watcher that triggered'),
      watcherType: z
        .string()
        .describe('Type of the watcher event (e.g., ADDRESS_ACTIVITY, EVENT_TRANSFER)'),
      network: z.string().describe('Blockchain network'),
      contractAddress: z.string().optional().describe('Smart contract address if applicable'),
      fromAddress: z.string().optional().describe('Sender address'),
      toAddress: z.string().optional().describe('Recipient address'),
      transactionHash: z.string().optional().describe('On-chain transaction hash'),
      blockNumber: z.number().optional().describe('Block number of the event'),
      value: z.string().optional().describe('Value transferred if applicable'),
      tokenId: z.string().optional().describe('Token ID for NFT events'),
      rawEvent: z.any().describe('Complete raw event data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      // Starton watchers are created by the manage_watchers tool.
      // The webhook URL is configured during watcher creation.
      // We store the base URL for reference during unregistration.
      return {
        registrationDetails: {
          webhookBaseUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async _ctx => {
      // Watcher cleanup is handled through the manage_watchers tool.
      // No automatic unregistration needed.
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      // Starton webhook sends event data in the request body
      // The structure can vary based on watcher type
      let eventData = data?.data || data;
      let watcherType = data?.type || eventData?.type || 'UNKNOWN';
      let network = eventData?.network || data?.network || '';
      let watcherId = data?.watcherId || eventData?.watcherId || '';

      // Generate a unique event ID from available data
      let txHash = eventData?.transaction?.hash || eventData?.transactionHash || '';
      let logIndex = eventData?.transaction?.logIndex || eventData?.logIndex || '0';
      let eventId = txHash ? `${txHash}-${logIndex}` : `${watcherId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventId,
            watcherId,
            watcherType,
            network,
            payload: eventData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload || {};
      let transaction = payload.transaction || {};

      return {
        type: `blockchain.${ctx.input.watcherType.toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          watcherId: ctx.input.watcherId,
          watcherType: ctx.input.watcherType,
          network: ctx.input.network,
          contractAddress: payload.contractAddress || transaction.to || undefined,
          fromAddress: payload.from || transaction.from || undefined,
          toAddress: payload.to || transaction.to || undefined,
          transactionHash: transaction.hash || payload.transactionHash || undefined,
          blockNumber: transaction.blockNumber || payload.blockNumber || undefined,
          value: transaction.value || payload.value || undefined,
          tokenId: payload.tokenId || undefined,
          rawEvent: payload
        }
      };
    }
  })
  .build();
