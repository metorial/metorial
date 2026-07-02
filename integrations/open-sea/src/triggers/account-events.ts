import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let accountEvents = SlateTrigger.create(spec, {
  name: 'Account Events',
  key: 'account_events',
  description:
    'Triggers when new marketplace events occur for a specific wallet address — including sales, purchases, transfers, listings, and cancellations.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (sale, transfer, cancel, order, redemption)'),
      eventTimestamp: z.string().describe('Timestamp of the event'),
      chain: z.string().nullable().describe('Blockchain the event occurred on'),
      contractAddress: z.string().nullable().describe('Contract address'),
      tokenIdentifier: z.string().nullable().describe('Token ID'),
      collectionSlug: z.string().nullable().describe('Collection slug'),
      maker: z.string().nullable().describe('Address that initiated the action'),
      taker: z.string().nullable().describe('Address that fulfilled the action'),
      fromAddress: z.string().nullable().describe('Sender address for transfers'),
      toAddress: z.string().nullable().describe('Recipient address for transfers'),
      paymentAmount: z.string().nullable().describe('Payment amount'),
      paymentSymbol: z.string().nullable().describe('Payment token symbol'),
      transactionHash: z.string().nullable().describe('On-chain transaction hash'),
      orderHash: z.string().nullable().describe('Order hash'),
      quantity: z.number().nullable().describe('Quantity involved'),
      rawEvent: z.any().describe('Full raw event payload from OpenSea')
    })
  )
  .output(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (sale, transfer, cancel, order, redemption)'),
      eventTimestamp: z.string().describe('Timestamp when the event occurred'),
      chain: z.string().nullable().describe('Blockchain the event occurred on'),
      contractAddress: z.string().nullable().describe('NFT contract address'),
      tokenIdentifier: z.string().nullable().describe('Token ID of the affected NFT'),
      collectionSlug: z.string().nullable().describe('Collection slug'),
      maker: z.string().nullable().describe('Address that initiated the action'),
      taker: z.string().nullable().describe('Address that fulfilled the action'),
      fromAddress: z.string().nullable().describe('Sender address (transfers)'),
      toAddress: z.string().nullable().describe('Recipient address (transfers)'),
      paymentAmount: z.string().nullable().describe('Payment amount in smallest unit'),
      paymentSymbol: z.string().nullable().describe('Payment token symbol'),
      transactionHash: z.string().nullable().describe('On-chain transaction hash'),
      orderHash: z.string().nullable().describe('Order hash, if applicable'),
      quantity: z.number().nullable().describe('Quantity involved in the event')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let accountAddress = (ctx.state as any)?.accountAddress;
      if (!accountAddress) {
        return { inputs: [], updatedState: ctx.state };
      }

      let lastTimestamp = (ctx.state as any)?.lastEventTimestamp;
      let afterParam = lastTimestamp
        ? Math.floor(lastTimestamp)
        : Math.floor(Date.now() / 1000) - 300;

      let data = await client.getEventsByAccount(accountAddress, {
        after: afterParam,
        limit: 50
      });

      let events = data.asset_events ?? [];

      let inputs = events.map((e: any) => {
        let ts = e.event_timestamp ?? new Date().toISOString();
        return {
          eventType: e.event_type ?? 'unknown',
          eventTimestamp: ts,
          chain: e.chain ?? null,
          contractAddress: e.nft?.contract ?? null,
          tokenIdentifier: e.nft?.identifier ?? null,
          collectionSlug: e.collection_slug ?? e.nft?.collection ?? null,
          maker: e.maker ?? null,
          taker: e.taker ?? null,
          fromAddress: e.from_address ?? null,
          toAddress: e.to_address ?? null,
          paymentAmount: e.payment?.quantity ?? null,
          paymentSymbol: e.payment?.symbol ?? null,
          transactionHash: e.transaction ?? null,
          orderHash: e.order_hash ?? null,
          quantity: e.quantity ?? null,
          rawEvent: e
        };
      });

      let newTimestamp = afterParam;
      for (let e of events) {
        if (e.event_timestamp) {
          let ts = Math.floor(new Date(e.event_timestamp).getTime() / 1000);
          if (ts > newTimestamp) {
            newTimestamp = ts;
          }
        }
      }

      return {
        inputs,
        updatedState: {
          ...(ctx.state as any),
          lastEventTimestamp: newTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      let eventId =
        ctx.input.orderHash ||
        ctx.input.transactionHash ||
        `${ctx.input.eventType}_${ctx.input.contractAddress}_${ctx.input.tokenIdentifier}_${ctx.input.eventTimestamp}`;

      return {
        type: `nft.${ctx.input.eventType}`,
        id: eventId,
        output: {
          eventType: ctx.input.eventType,
          eventTimestamp: ctx.input.eventTimestamp,
          chain: ctx.input.chain,
          contractAddress: ctx.input.contractAddress,
          tokenIdentifier: ctx.input.tokenIdentifier,
          collectionSlug: ctx.input.collectionSlug,
          maker: ctx.input.maker,
          taker: ctx.input.taker,
          fromAddress: ctx.input.fromAddress,
          toAddress: ctx.input.toAddress,
          paymentAmount: ctx.input.paymentAmount,
          paymentSymbol: ctx.input.paymentSymbol,
          transactionHash: ctx.input.transactionHash,
          orderHash: ctx.input.orderHash,
          quantity: ctx.input.quantity
        }
      };
    }
  })
  .build();
