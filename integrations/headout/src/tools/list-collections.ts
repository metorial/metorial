import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let collectionSchema = z
  .object({
    collectionId: z.string().describe('Collection identifier'),
    name: z.string().describe('Collection name'),
    cityCode: z.string().optional().describe('City code'),
    canonicalUrl: z.string().optional().describe('Collection page URL'),
    localeUrls: z
      .record(z.string(), z.string())
      .optional()
      .describe('Language-specific URLs keyed by language code')
  })
  .passthrough();

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List curated collections of experiences for a given city.
Collections are themed groupings (e.g., "Top Attractions", "Family-Friendly") that can be used to filter product searches.`,
  instructions: ['Use the returned collectionId as a filter in the "Search Products" tool.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cityCode: z.string().describe('City code (e.g., NEW_YORK, DUBAI)'),
      languageCode: z
        .string()
        .optional()
        .describe('Override default language (EN, ES, FR, IT, DE, PT, NL)'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      collections: z.array(collectionSchema).describe('List of collections'),
      total: z.number().optional().describe('Total number of collections'),
      nextOffset: z.number().optional().describe('Offset for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      languageCode: ctx.config.languageCode,
      currencyCode: ctx.config.currencyCode
    });

    let result = await client.listCollections(ctx.input.cityCode, {
      languageCode: ctx.input.languageCode,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let collections = (result.items ?? result.collections ?? []).map((c: any) => ({
      collectionId: String(c.id ?? c.collectionId ?? ''),
      name: c.name ?? '',
      cityCode: c.cityCode,
      canonicalUrl: c.canonicalUrl,
      localeUrls: c.localeSpecificUrls
    }));

    return {
      output: {
        collections,
        total: result.total,
        nextOffset: result.nextOffset
      },
      message: `Found ${result.total ?? collections.length} collections in **${ctx.input.cityCode}**. Showing ${collections.length} results.`
    };
  })
  .build();
