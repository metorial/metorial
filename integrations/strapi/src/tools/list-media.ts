import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMedia = SlateTool.create(spec, {
  name: 'List Media',
  key: 'list_media',
  description: `List files from the Strapi media library. Returns uploaded images, videos, documents, and other files with their metadata including URLs, dimensions, and format info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of files per page'),
      sort: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Sort order (e.g., "createdAt:desc")'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter criteria (e.g., {"mime": {"$contains": "image"}})')
    })
  )
  .output(
    z.object({
      files: z
        .array(z.record(z.string(), z.any()))
        .describe('List of media files with metadata'),
      pagination: z
        .object({
          page: z.number().optional(),
          pageSize: z.number().optional(),
          pageCount: z.number().optional(),
          total: z.number().optional(),
          start: z.number().optional(),
          limit: z.number().optional()
        })
        .optional()
        .describe(
          'Native pagination counts when provided. Strapi 4 offset lists have no total count.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let result = await client.listFiles({
      pagination: {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      },
      sort: ctx.input.sort,
      filters: ctx.input.filters
    });

    let count = result.data.length;

    return {
      output: {
        files: result.data,
        pagination: result.meta.pagination
      },
      message: `Retrieved **${count}** media files.`
    };
  })
  .build();
