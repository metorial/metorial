import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let listingSchema = z.object({
  orderHash: z.string().nullable().describe('Unique hash of the listing order'),
  chain: z.string().nullable().describe('Blockchain'),
  contractAddress: z.string().nullable().describe('NFT contract address'),
  tokenIdentifier: z.string().nullable().describe('Token ID of the listed NFT'),
  priceAmount: z
    .string()
    .nullable()
    .describe("Listing price in the payment token's smallest unit"),
  priceSymbol: z.string().nullable().describe('Payment token symbol'),
  priceDecimals: z.number().nullable().describe('Decimal places for the payment token'),
  maker: z.string().nullable().describe('Address that created the listing'),
  listingTimestamp: z.string().nullable().describe('When the listing was created'),
  expirationTimestamp: z.string().nullable().describe('When the listing expires'),
  orderType: z.string().nullable().describe('Type of the order')
});

export let getListings = SlateTool.create(spec, {
  name: 'Get Listings',
  key: 'get_listings',
  description: `Retrieve active marketplace listings for NFTs. Get all listings or the best (cheapest) listings for a collection, or the best listing for a specific NFT. Useful for price discovery and marketplace monitoring.`,
  instructions: [
    'Use bestOnly=true to get only the cheapest listings per NFT in a collection.',
    'Provide tokenIdentifier along with collectionSlug to get the best listing for a specific NFT.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      collectionSlug: z.string().describe('Collection slug to get listings for'),
      tokenIdentifier: z
        .string()
        .optional()
        .describe('Token ID to get the best listing for a specific NFT'),
      bestOnly: z
        .boolean()
        .optional()
        .describe('If true, returns only the best (cheapest) listings per NFT'),
      limit: z.number().optional().describe('Number of results per page'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      listings: z.array(listingSchema).describe('List of active listings'),
      nextCursor: z.string().nullable().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data: any;

    if (ctx.input.tokenIdentifier) {
      data = await client.getBestListingByNft(
        ctx.input.collectionSlug,
        ctx.input.tokenIdentifier
      );
    } else if (ctx.input.bestOnly) {
      data = await client.getBestListingsByCollection(ctx.input.collectionSlug, {
        limit: ctx.input.limit,
        next: ctx.input.cursor
      });
    } else {
      data = await client.getAllListingsByCollection(ctx.input.collectionSlug, {
        limit: ctx.input.limit,
        next: ctx.input.cursor
      });
    }

    let rawListings = data.listings ?? (data.order ? [data.order] : []);
    let listings = rawListings.map((l: any) => {
      let price = l.price?.current ?? l.price ?? {};
      return {
        orderHash: l.order_hash ?? null,
        chain: l.chain ?? null,
        contractAddress: l.protocol_data?.parameters?.offer?.[0]?.token ?? null,
        tokenIdentifier: l.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria ?? null,
        priceAmount: price.value ?? price.amount ?? null,
        priceSymbol: price.currency ?? price.symbol ?? null,
        priceDecimals: price.decimals ?? null,
        maker: l.maker?.address ?? l.protocol_data?.parameters?.offerer ?? null,
        listingTimestamp:
          l.listing_timestamp ?? l.protocol_data?.parameters?.startTime ?? null,
        expirationTimestamp:
          l.expiration_timestamp ?? l.protocol_data?.parameters?.endTime ?? null,
        orderType: l.type ?? l.order_type ?? null
      };
    });

    return {
      output: {
        listings,
        nextCursor: data.next ?? null
      },
      message: `Found **${listings.length}** listing(s) for collection \`${ctx.input.collectionSlug}\`.${data.next ? ' More results available.' : ''}`
    };
  })
  .build();
