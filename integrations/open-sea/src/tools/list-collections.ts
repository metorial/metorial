import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let collectionSummarySchema = z.object({
  collectionSlug: z.string().describe('Collection slug'),
  name: z.string().describe('Collection name'),
  description: z.string().nullable().describe('Collection description'),
  imageUrl: z.string().nullable().describe('Collection image URL'),
  owner: z.string().nullable().describe('Owner address'),
  openseaUrl: z.string().nullable().describe('OpenSea URL'),
  category: z.string().nullable().describe('Collection category')
});

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `Browse NFT collections on OpenSea. Optionally filter by blockchain. Supports cursor-based pagination for browsing large result sets.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chain: z
        .string()
        .optional()
        .describe('Filter collections by blockchain (e.g. ethereum, polygon)'),
      orderBy: z
        .enum([
          'created_date',
          'market_cap',
          'num_owners',
          'one_day_change',
          'seven_day_average_price',
          'seven_day_change',
          'seven_day_sales',
          'seven_day_volume'
        ])
        .optional()
        .describe('Sort order for collections'),
      limit: z.number().optional().describe('Number of results per page (max 200)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      collections: z.array(collectionSummarySchema).describe('List of collections'),
      nextCursor: z.string().nullable().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listCollections({
      chainIdentifier: ctx.input.chain,
      orderBy: ctx.input.orderBy,
      limit: ctx.input.limit,
      next: ctx.input.cursor
    });

    let collections = (data.collections ?? []).map((c: any) => ({
      collectionSlug: c.collection ?? '',
      name: c.name ?? '',
      description: c.description ?? null,
      imageUrl: c.image_url ?? null,
      owner: c.owner ?? null,
      openseaUrl: c.opensea_url ?? null,
      category: c.category ?? null
    }));

    return {
      output: {
        collections,
        nextCursor: data.next ?? null
      },
      message: `Found **${collections.length}** collection(s).${data.next ? ' More results available.' : ''}`
    };
  })
  .build();
