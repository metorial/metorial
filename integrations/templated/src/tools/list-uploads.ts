import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUploads = SlateTool.create(spec, {
  name: 'List Uploads',
  key: 'list_uploads',
  description: `List uploaded images in your account. Supports searching by name or tag and filtering by tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search uploads by name or tag'),
      tags: z.string().optional().describe('Filter by comma-separated tags'),
      page: z.number().optional().describe('Page number (starts at 0)'),
      limit: z.number().optional().describe('Results per page. Default: 15')
    })
  )
  .output(
    z.object({
      uploads: z.array(
        z.object({
          uploadId: z.string().optional(),
          name: z.string().optional(),
          size: z.number().optional(),
          contentType: z.string().optional(),
          createdAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let uploads = await client.listUploads({
      query: ctx.input.query,
      tags: ctx.input.tags,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let items = Array.isArray(uploads) ? uploads : [];

    return {
      output: {
        uploads: items.map((u: any) => ({
          uploadId: u.id,
          name: u.name,
          size: u.size,
          contentType: u.contentType,
          createdAt: u.createdAt
        }))
      },
      message: `Found **${items.length}** upload(s).`
    };
  })
  .build();
