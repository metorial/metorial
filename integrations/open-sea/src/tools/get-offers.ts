import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let offerSchema = z.object({
  orderHash: z.string().nullable().describe('Unique hash of the offer order'),
  chain: z.string().nullable().describe('Blockchain'),
  priceAmount: z
    .string()
    .nullable()
    .describe("Offer price in the payment token's smallest unit"),
  priceSymbol: z.string().nullable().describe('Payment token symbol'),
  priceDecimals: z.number().nullable().describe('Decimal places for the payment token'),
  maker: z.string().nullable().describe('Address that created the offer'),
  offerTimestamp: z.string().nullable().describe('When the offer was created'),
  expirationTimestamp: z.string().nullable().describe('When the offer expires'),
  orderType: z.string().nullable().describe('Type of the order'),
  quantity: z.number().nullable().describe('Number of items the offer applies to')
});

export let getOffers = SlateTool.create(spec, {
  name: 'Get Offers',
  key: 'get_offers',
  description: `Retrieve active offers for NFTs on the OpenSea marketplace. Get all collection-level offers, trait-based offers, or the best offer for a specific NFT. Useful for understanding demand and evaluating incoming bids.`,
  instructions: [
    'To get offers for a specific NFT, provide both collectionSlug and tokenIdentifier.',
    'To get trait-based offers, set traitOffers=true.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      collectionSlug: z.string().describe('Collection slug to get offers for'),
      tokenIdentifier: z
        .string()
        .optional()
        .describe('Token ID to get the best offer for a specific NFT'),
      traitOffers: z
        .boolean()
        .optional()
        .describe('If true, returns trait-based offers instead of collection offers'),
      limit: z.number().optional().describe('Number of results per page'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      offers: z.array(offerSchema).describe('List of active offers'),
      nextCursor: z.string().nullable().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data: any;

    if (ctx.input.tokenIdentifier) {
      data = await client.getBestOfferByNft(
        ctx.input.collectionSlug,
        ctx.input.tokenIdentifier
      );
    } else if (ctx.input.traitOffers) {
      data = await client.getTraitOffers(ctx.input.collectionSlug, {
        limit: ctx.input.limit,
        next: ctx.input.cursor
      });
    } else {
      data = await client.getOffersByCollection(ctx.input.collectionSlug, {
        limit: ctx.input.limit,
        next: ctx.input.cursor
      });
    }

    let rawOffers = data.offers ?? (data.order ? [data.order] : []);
    let offers = rawOffers.map((o: any) => {
      let price = o.price?.current ?? o.price ?? {};
      return {
        orderHash: o.order_hash ?? null,
        chain: o.chain ?? null,
        priceAmount: price.value ?? price.amount ?? null,
        priceSymbol: price.currency ?? price.symbol ?? null,
        priceDecimals: price.decimals ?? null,
        maker: o.maker?.address ?? o.protocol_data?.parameters?.offerer ?? null,
        offerTimestamp: o.listing_timestamp ?? o.protocol_data?.parameters?.startTime ?? null,
        expirationTimestamp:
          o.expiration_timestamp ?? o.protocol_data?.parameters?.endTime ?? null,
        orderType: o.type ?? o.order_type ?? null,
        quantity: o.protocol_data?.parameters?.offer?.[0]?.startAmount
          ? Number(o.protocol_data.parameters.offer[0].startAmount)
          : null
      };
    });

    return {
      output: {
        offers,
        nextCursor: data.next ?? null
      },
      message: `Found **${offers.length}** offer(s) for collection \`${ctx.input.collectionSlug}\`.${data.next ? ' More results available.' : ''}`
    };
  })
  .build();
