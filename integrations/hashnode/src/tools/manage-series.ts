import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    .describe('Posts in the series'),
  totalPosts: z.number().nullable().optional().describe('Total number of posts')
});

export let manageSeries = SlateTool.create(spec, {
  name: 'Manage Series',
  key: 'manage_series',
  description: `Create, retrieve, list, update, or delete a post series. A series groups related articles so readers can view them in order.
- **create**: Create a new series.
- **get**: Get a series by its slug, including its posts.
- **list**: List all series in the publication.
- **update**: Update a series name, slug, description, or cover image.
- **delete**: Remove a series permanently.`
})
  .input(
    z.object({
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
      first: z.number().optional().default(10).describe('Number of series to list'),
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
      publicationHost: ctx.config.publicationHost
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required to create a series');

      let series = await client.createSeries({
        name: ctx.input.name,
        slug: ctx.input.slug,
        description: ctx.input.description,
        coverImage: ctx.input.coverImage,
        sortOrder: ctx.input.sortOrder
      });

      return {
        output: {
          series: {
            seriesId: series.id,
            name: series.name,
            slug: series.slug,
            createdAt: series.createdAt
          }
        },
        message: `Created series **"${series.name}"**`
      };
    }

    if (action === 'get') {
      if (!ctx.input.slug) throw new Error('slug is required to get a series');

      let series = await client.getSeriesBySlug(ctx.input.slug);
      if (!series) throw new Error('Series not found');

      let posts = (series.posts?.edges || []).map((e: any) => ({
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
            totalPosts: series.posts?.totalDocuments
          }
        },
        message: `Retrieved series **"${series.name}"** with ${posts.length} posts`
      };
    }

    if (action === 'list') {
      let result = await client.listSeries({
        first: Math.min(ctx.input.first, 20),
        after: ctx.input.after
      });

      let seriesList = result.series.map((s: any) => ({
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

    if (action === 'update') {
      if (!ctx.input.seriesId) throw new Error('seriesId is required to update a series');

      let series = await client.updateSeries(ctx.input.seriesId, {
        name: ctx.input.name,
        slug: ctx.input.slug,
        description: ctx.input.description,
        coverImage: ctx.input.coverImage,
        sortOrder: ctx.input.sortOrder
      });

      return {
        output: {
          series: {
            seriesId: series.id,
            name: series.name,
            slug: series.slug
          }
        },
        message: `Updated series **"${series.name}"**`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.seriesId) throw new Error('seriesId is required to delete a series');

      await client.removeSeries(ctx.input.seriesId);

      return {
        output: {
          deleted: true
        },
        message: `Deleted series \`${ctx.input.seriesId}\``
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
