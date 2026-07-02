import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

let creationSchema = z.object({
  identifier: z.string().describe('Unique identifier of the creation'),
  name: z.string().nullable().describe('Name of the creation'),
  url: z.string().nullable().describe('Full URL to the creation page'),
  shortUrl: z.string().nullable().describe('Short URL for sharing'),
  publishedAt: z.string().nullable().describe('ISO-8601 publication date'),
  illustrationImageUrl: z.string().nullable().describe('Cover image URL'),
  downloadsCount: z.number().nullable().describe('Number of downloads'),
  likesCount: z.number().nullable().describe('Number of likes'),
  viewsCount: z.number().nullable().describe('Number of views'),
  madeWithAi: z.boolean().nullable().describe('Whether the design was made with AI'),
  tags: z.array(z.string()).nullable().describe('Tags on the creation'),
  creatorNick: z.string().nullable().describe('Username of the creator'),
  categoryName: z.string().nullable().describe('Category name'),
  priceUsd: z.number().nullable().describe('Price in USD'),
  discountPercentage: z.number().nullable().describe('Current discount percentage'),
  discountEndAt: z.string().nullable().describe('When the discount expires')
});

export let browseCreations = SlateTool.create(spec, {
  name: 'Browse Creations',
  key: 'browse_creations',
  description: `Browse the Cults3D catalog with filters and sorting. Supports filtering by price (free, paid, discounted), AI-generated flag, date range, and sorting by publication date, likes, or downloads. Use this to discover trending or new designs.`,
  instructions: [
    'Sort values: BY_PUBLICATION, BY_LIKES, BY_DOWNLOADS',
    'Direction values: ASC, DESC',
    'Dates should be in ISO-8601 format (e.g. 2024-01-01T00:00:00Z)'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of results (default 20)'),
      offset: z
        .number()
        .min(0)
        .optional()
        .describe('Number of results to skip for pagination'),
      sort: z
        .enum(['BY_PUBLICATION', 'BY_LIKES', 'BY_DOWNLOADS'])
        .optional()
        .describe('Sort field'),
      direction: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      onlyFree: z.boolean().optional().describe('Only return free designs'),
      onlyPriced: z.boolean().optional().describe('Only return paid designs'),
      onlyDiscounted: z
        .boolean()
        .optional()
        .describe('Only return currently discounted designs'),
      submittedAfter: z
        .string()
        .optional()
        .describe('Only designs submitted after this ISO-8601 date'),
      submittedBefore: z
        .string()
        .optional()
        .describe('Only designs submitted before this ISO-8601 date'),
      madeWithAi: z.boolean().optional().describe('Filter by AI-generated flag')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching results'),
      creations: z.array(creationSchema).describe('List of creations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.browseCreations({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      direction: ctx.input.direction,
      onlyFree: ctx.input.onlyFree,
      onlyPriced: ctx.input.onlyPriced,
      onlyDiscounted: ctx.input.onlyDiscounted,
      submittedAfter: ctx.input.submittedAfter,
      submittedBefore: ctx.input.submittedBefore,
      madeWithAi: ctx.input.madeWithAi
    });

    let creations = result.results.map((c: any) => ({
      identifier: c.identifier,
      name: c.name,
      url: c.url,
      shortUrl: c.shortUrl,
      publishedAt: c.publishedAt,
      illustrationImageUrl: c.illustrationImageUrl,
      downloadsCount: c.downloadsCount,
      likesCount: c.likesCount,
      viewsCount: c.viewsCount,
      madeWithAi: c.madeWithAi,
      tags: c.tags,
      creatorNick: c.creator?.nick ?? null,
      categoryName: c.category?.name ?? null,
      priceUsd: c.price?.value ?? null,
      discountPercentage: c.discount?.percentage ?? null,
      discountEndAt: c.discount?.endAt ?? null
    }));

    return {
      output: {
        total: result.total,
        creations
      },
      message: `Found **${result.total}** creations. Returned ${creations.length} results.`
    };
  })
  .build();
