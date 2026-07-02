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
        .describe('List of media files with metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let files = await client.listFiles({
      pagination: {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      },
      sort: ctx.input.sort,
      filters: ctx.input.filters
    });

    let count = Array.isArray(files) ? files.length : 0;

    return {
      output: {
        files: Array.isArray(files) ? files : []
      },
      message: `Retrieved **${count}** media files.`
    };
  })
  .build();
