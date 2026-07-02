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
  priceUsd: z.number().nullable().describe('Price in USD')
});

export let searchCreations = SlateTool.create(spec, {
  name: 'Search Creations',
  key: 'search_creations',
  description: `Search the Cults3D catalog for 3D printing designs by keyword. Returns matching designs with metadata including title, creator, price, download count, and images. Use this to find specific designs or explore the catalog.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchQuery: z.string().describe('Search keyword or phrase'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of results to return (default 20)'),
      offset: z.number().min(0).optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching results'),
      creations: z.array(creationSchema).describe('List of matching creations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.searchCreations({
      searchQuery: ctx.input.searchQuery,
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
      madeWithAi: c.madeWithAi,
      tags: c.tags,
      creatorNick: c.creator?.nick ?? null,
      categoryName: c.category?.name ?? null,
      priceUsd: c.price?.value ?? null
    }));

    return {
      output: {
        total: result.total,
        creations
      },
      message: `Found **${result.total}** creations matching "${ctx.input.searchQuery}". Returned ${creations.length} results.`
    };
  })
  .build();
