import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { selection } from '../lib/schemas';
import { spec } from '../spec';

let seriesOutputSchema = z.object({
  seriesId: z.string().describe('Series ID'),
  name: z.string().nullable().optional().describe('Series name'),
  slug: z.string().nullable().optional().describe('Series slug'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  descriptionMarkdown: z.string().nullable().optional().describe('Description in Markdown'),
  coverImage: z.string().nullable().optional().describe('Cover image URL'),
  sortOrder: z.string().nullable().optional().describe('Sort order for posts in the series'),
  authorUsername: z.string().nullable().optional().describe('Author username'),
  posts: z
    .array(
      z.object({
        postId: z.string(),
        title: z.string(),
        slug: z.string(),
        url: z.string()
      })
    )
    .optional()
    .describe('At most 20 posts in the series; remaining posts require the dashboard.'),
  postsHasNextPage: z.boolean().optional(),
  postsEndCursor: z.string().nullable().optional(),
  totalPosts: z.number().nullable().optional().describe('Native total number of posts')
});

export let manageSeries = SlateTool.create(spec, {
  name: 'Manage Series',
  key: 'manage_series',
  description: `Read a series by slug or list a page of series in the selected publication. Series reads include at most 20 posts. Legacy create, update, and delete inputs remain accepted for compatibility, but those writes are absent from the current public API and refuse locally. Use the dashboard for series changes.`
})
  .input(
    z.object({
      ...selection,
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete'])
        .describe('Operation to perform'),
      seriesId: z
        .string()
        .optional()
        .describe('Series ID — required for "update" and "delete"'),
      slug: z
        .string()
        .optional()
        .describe('Series slug — used for "get" lookup and optionally for "create"/"update"'),
      name: z.string().optional().describe('Series name — required for "create"'),
      description: z
        .string()
        .optional()
        .describe('Series description in Markdown — used with "create" and "update"'),
      coverImage: z
        .string()
        .optional()
        .describe('Cover image URL — used with "create" and "update"'),
      sortOrder: z
        .string()
        .optional()
        .describe('Sort order (e.g. "asc" or "desc") — used with "create" and "update"'),
      first: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(10)
        .describe('Number of series to list'),
      after: z.string().optional().describe('Pagination cursor for "list"')
    })
  )
  .output(
    z.object({
      series: seriesOutputSchema.nullable().optional().describe('Single series result'),
      seriesList: z
        .array(
          z.object({
            seriesId: z.string(),
            name: z.string().nullable().optional(),
            slug: z.string().nullable().optional(),
            createdAt: z.string().nullable().optional(),
            descriptionMarkdown: z.string().nullable().optional(),
            sortOrder: z.string().nullable().optional()
          })
        )
        .nullable()
        .optional()
        .describe('List of series'),
      hasNextPage: z.boolean().optional(),
      endCursor: z.string().nullable().optional(),
      totalDocuments: z.number().nullable().optional(),
      deleted: z.boolean().optional().describe('Whether the series was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicationHost:
        ctx.input.publicationHost ??
        (ctx.input.publicationId === undefined ? ctx.config.publicationHost : undefined),
      publicationId: ctx.input.publicationId
    });

    let { action } = ctx.input;

    if (!['get', 'list'].includes(action))
      throw createApiServiceError(
        'Series writes are unavailable in the current public API. Use the Hashnode dashboard; no request was sent.',
        { reason: 'unsupported_operation' }
      );

    if (action === 'get') {
      if (!ctx.input.slug) throw createApiServiceError('slug is required to get a series');

      let series = await client.getSeriesBySlug(ctx.input.slug);
      if (!series) throw createApiServiceError('Series not found');

      let posts = (series.posts?.edges || []).map(e => ({
        postId: e.node.id,
        title: e.node.title,
        slug: e.node.slug,
        url: e.node.url
      }));

      return {
        output: {
          series: {
            seriesId: series.id,
            name: series.name,
            slug: series.slug,
            createdAt: series.createdAt,
            descriptionMarkdown: series.description?.markdown,
            coverImage: series.coverImage,
            sortOrder: series.sortOrder,
            authorUsername: series.author?.username,
            posts,
            postsHasNextPage: series.posts?.pageInfo.hasNextPage,
            postsEndCursor: series.posts?.pageInfo.endCursor,
            totalPosts: series.posts?.pageInfo.totalDocuments
          }
        },
        message: `Retrieved series **"${series.name}"** with ${posts.length} posts`
      };
    }

    if (action === 'list') {
      let result = await client.listSeries({
        first: ctx.input.first,
        after: ctx.input.after
      });

      let seriesList = result.series.map(s => ({
        seriesId: s.id,
        name: s.name,
        slug: s.slug,
        createdAt: s.createdAt,
        descriptionMarkdown: s.description?.markdown,
        sortOrder: s.sortOrder
      }));

      return {
        output: {
          seriesList,
          hasNextPage: result.pageInfo?.hasNextPage ?? false,
          endCursor: result.pageInfo?.endCursor,
          totalDocuments: result.totalDocuments
        },
        message: `Found **${seriesList.length}** series${result.totalDocuments ? ` (${result.totalDocuments} total)` : ''}`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
