import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoinrankingClient } from '../lib/client';
import { paginationSchema, rawDataSchema, timePeriodSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description:
    'Discover cryptocurrency category and ecosystem tag slugs for the list_coins tag filter, with aggregate market statistics.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      referenceCurrencyUuid: z
        .string()
        .optional()
        .describe('Currency UUID discovered with list_reference_currencies'),
      timePeriod: timePeriodSchema
        .optional()
        .describe('Time period for market-cap change calculations; defaults to 24h'),
      type: z.enum(['category', 'ecosystem']).optional().describe('Filter by tag type'),
      limit: z
        .number()
        .optional()
        .describe('Results per page: 1–5000, maximum 100 on the free plan; defaults to 50'),
      offset: z.number().optional().describe('Offset for pagination; omit when using cursor'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor from pagination.nextCursor or pagination.previousCursor')
    })
  )
  .output(
    z.object({
      tags: z.array(
        z.object({
          slug: z.string(),
          shortname: z.string(),
          name: z.string(),
          type: z.string(),
          description: z.string().optional(),
          iconUrl: z.string().optional(),
          numberOfCoins: z.number(),
          volume24h: z.string().optional(),
          marketCap: z.string().optional(),
          marketCapChange: z.string().optional(),
          topCurrencySymbol: z.string().optional(),
          topCurrencyMarketCap: z.string().optional(),
          topCurrencyDominance: z.string().optional(),
          coinrankingUrl: z.string().optional()
        })
      ),
      totalTags: z.number(),
      pagination: paginationSchema.optional(),
      rawData: rawDataSchema
        .optional()
        .describe('Original provider data, including additional fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinrankingClient({
      token: ctx.auth.token,
      referenceCurrencyUuid: ctx.config.referenceCurrencyUuid
    });
    let result = await client.listTags(ctx.input);
    return {
      output: {
        tags: result.data.tags.map(tag => ({
          slug: tag.slug,
          shortname: tag.shortname,
          name: tag.name,
          type: tag.type,
          description: tag.description ?? undefined,
          iconUrl: tag.iconUrl ?? undefined,
          numberOfCoins: tag.numberOfCoins,
          volume24h: tag['24hVolume'] ?? undefined,
          marketCap: tag.marketCap ?? undefined,
          marketCapChange: tag.marketCapChange ?? undefined,
          topCurrencySymbol: tag.topCurrencySymbol ?? undefined,
          topCurrencyMarketCap: tag.topCurrencyMarketCap ?? undefined,
          topCurrencyDominance: tag.topCurrencyDominance ?? undefined,
          coinrankingUrl: tag.coinrankingUrl ?? undefined
        })),
        totalTags: result.data.stats.total,
        pagination: result.pagination,
        rawData: result.data
      },
      message: `Retrieved ${result.data.tags.length} of ${result.data.stats.total} tags.`
    };
  })
  .build();
