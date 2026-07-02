import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

let myCreationSchema = z.object({
  identifier: z.string().describe('Unique identifier'),
  name: z.string().nullable().describe('Creation name'),
  url: z.string().nullable().describe('Full URL'),
  shortUrl: z.string().nullable().describe('Short URL'),
  publishedAt: z.string().nullable().describe('Publication date'),
  illustrationImageUrl: z.string().nullable().describe('Cover image URL'),
  downloadsCount: z.number().nullable().describe('Number of downloads'),
  likesCount: z.number().nullable().describe('Number of likes'),
  viewsCount: z.number().nullable().describe('Number of views'),
  visibility: z.string().nullable().describe('Visibility state'),
  madeWithAi: z.boolean().nullable().describe('AI-generated flag'),
  tags: z.array(z.string()).nullable().describe('Tags'),
  totalSalesAmountUsd: z.number().nullable().describe('Total sales in USD'),
  priceUsd: z.number().nullable().describe('Price in USD'),
  categoryName: z.string().nullable().describe('Category name')
});

export let getMyCreations = SlateTool.create(spec, {
  name: 'Get My Creations',
  key: 'get_my_creations',
  description: `List your own published 3D designs on Cults3D. Returns creations with visibility status, sales totals, download counts, and other stats. Supports pagination.`,
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
        .describe('Maximum number of creations (default 20)'),
      offset: z
        .number()
        .min(0)
        .optional()
        .describe('Number of creations to skip for pagination')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of your creations'),
      creations: z.array(myCreationSchema).describe('List of your creations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.getMyCreations({
      limit: ctx.input.limit,
      offset: ctx.input.offset
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
      visibility: c.visibility,
      madeWithAi: c.madeWithAi,
      tags: c.tags,
      totalSalesAmountUsd: c.totalSalesAmount?.value ?? null,
      priceUsd: c.price?.value ?? null,
      categoryName: c.category?.name ?? null
    }));

    return {
      output: {
        total: result.total,
        creations
      },
      message: `You have **${result.total}** creations. Returned ${creations.length} results.`
    };
  })
  .build();
