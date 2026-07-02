import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUploads = SlateTool.create(spec, {
  name: 'List Uploads',
  key: 'list_uploads',
  description: `List media assets (uploads) in the project. Supports filtering by type and text search, with pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Text search query to filter uploads'),
      filterType: z
        .string()
        .optional()
        .describe('Filter by file type (e.g. "image", "video", "document")'),
      pageOffset: z.number().optional().describe('Zero-based offset for pagination'),
      pageLimit: z.number().optional().describe('Max uploads per page')
    })
  )
  .output(
    z.object({
      uploads: z.array(z.any()).describe('Array of upload objects'),
      totalCount: z.number().describe('Total number of matching uploads')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listUploads({
      filterQuery: ctx.input.query,
      filterType: ctx.input.filterType,
      pageOffset: ctx.input.pageOffset,
      pageLimit: ctx.input.pageLimit
    });

    return {
      output: {
        uploads: result.data,
        totalCount: result.totalCount
      },
      message: `Found **${result.totalCount}** uploads (returned ${result.data.length} in this page).`
    };
  })
  .build();
