import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  eventType: z.string().describe('Type of event (sale, transfer, cancel, order, redemption)'),
  eventTimestamp: z.string().nullable().describe('Timestamp when the event occurred'),
  orderHash: z.string().nullable().describe('The order hash, if applicable'),
  chain: z.string().nullable().describe('Blockchain the event occurred on'),
  contractAddress: z.string().nullable().describe('Contract address of the NFT'),
  tokenIdentifier: z.string().nullable().describe('Token ID of the NFT'),
  collectionSlug: z.string().nullable().describe('Collection slug'),
  quantity: z.number().nullable().describe('Quantity involved in the event'),
  maker: z.string().nullable().describe('Address that initiated the action'),
  taker: z.string().nullable().describe('Address that fulfilled the action'),
  fromAddress: z.string().nullable().describe('Sender address for transfers'),
  toAddress: z.string().nullable().describe('Recipient address for transfers'),
  paymentAmount: z
    .string()
    .nullable()
    .describe("Payment amount in the payment token's smallest unit"),
  paymentSymbol: z.string().nullable().describe('Symbol of the payment token'),
  transactionHash: z.string().nullable().describe('On-chain transaction hash')
});

export let getEvents = SlateTool.create(spec, {
  name: 'Get Events',
  key: 'get_events',
  description: `Query marketplace events such as sales, transfers, listings, offers, and cancellations. Events can be retrieved by collection, by specific NFT, or by account. Supports filtering by event type and time range.`,
  instructions: [
    'Provide exactly one of: collectionSlug, nft (chain + contractAddress + tokenIdentifier), or accountAddress.',
    'Time range filters (afterTimestamp, beforeTimestamp) use Unix timestamps in seconds.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      collectionSlug: z.string().optional().describe('Get events for a specific collection'),
      accountAddress: z
        .string()
        .optional()
        .describe('Get events for a specific account/wallet'),
      chain: z.string().optional().describe('Blockchain (required when querying by NFT)'),
      contractAddress: z
        .string()
        .optional()
        .describe('Contract address (used with chain and tokenIdentifier to query by NFT)'),
      tokenIdentifier: z
        .string()
        .optional()
        .describe('Token ID (used with chain and contractAddress to query by NFT)'),
      eventType: z
        .enum(['sale', 'transfer', 'cancel', 'order', 'redemption'])
        .optional()
        .describe('Filter by event type'),
      afterTimestamp: z
        .number()
        .optional()
        .describe('Only events after this Unix timestamp (seconds)'),
      beforeTimestamp: z
        .number()
        .optional()
        .describe('Only events before this Unix timestamp (seconds)'),
      limit: z.number().optional().describe('Number of results per page (max 200)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema).describe('List of events'),
      nextCursor: z.string().nullable().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let chain = ctx.input.chain || ctx.config.chain || 'ethereum';
    let data: any;
    let params = {
      eventType: ctx.input.eventType,
      after: ctx.input.afterTimestamp,
      before: ctx.input.beforeTimestamp,
      limit: ctx.input.limit,
      next: ctx.input.cursor
    };

    if (ctx.input.contractAddress && ctx.input.tokenIdentifier) {
      data = await client.getEventsByNft(
        chain,
        ctx.input.contractAddress,
        ctx.input.tokenIdentifier,
        params
      );
    } else if (ctx.input.collectionSlug) {
      data = await client.getEventsByCollection(ctx.input.collectionSlug, params);
    } else if (ctx.input.accountAddress) {
      data = await client.getEventsByAccount(ctx.input.accountAddress, params);
    } else {
      throw new Error(
        'Provide at least one of: collectionSlug, accountAddress, or contractAddress + tokenIdentifier.'
      );
    }

    let events = (data.asset_events ?? []).map((e: any) => ({
      eventType: e.event_type ?? 'unknown',
      eventTimestamp: e.event_timestamp ?? null,
      orderHash: e.order_hash ?? null,
      chain: e.chain ?? null,
      contractAddress: e.nft?.contract ?? null,
      tokenIdentifier: e.nft?.identifier ?? null,
      collectionSlug: e.collection_slug ?? e.nft?.collection ?? null,
      quantity: e.quantity ?? null,
      maker: e.maker ?? null,
      taker: e.taker ?? null,
      fromAddress: e.from_address ?? null,
      toAddress: e.to_address ?? null,
      paymentAmount: e.payment?.quantity ?? null,
      paymentSymbol: e.payment?.symbol ?? null,
      transactionHash: e.transaction ?? null
    }));

    return {
      output: {
        events,
        nextCursor: data.next ?? null
      },
      message: `Found **${events.length}** event(s).${data.next ? ' More results available with the next cursor.' : ''}`
    };
  })
  .build();
