import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyzineClient } from '../lib/client';
import { spec } from '../spec';

export let listFlipbooks = SlateTool.create(spec, {
  name: 'List Flipbooks',
  key: 'list_flipbooks',
  description: `Retrieves all flipbooks in the account. Supports filtering by search term and tags to narrow results.
Returns flipbook metadata including title, URL, thumbnail, page count, tags, and creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search term to filter flipbooks by title or content.'),
      tags: z.string().optional().describe('Comma-separated tags to filter flipbooks.')
    })
  )
  .output(
    z.object({
      flipbooks: z
        .array(
          z.object({
            flipbookId: z.string().describe('Unique identifier of the flipbook.'),
            title: z.string().describe('Title of the flipbook.'),
            subtitle: z.string().describe('Subtitle of the flipbook.'),
            description: z.string().describe('Description of the flipbook.'),
            url: z.string().describe('URL of the flipbook.'),
            thumbnailUrl: z.string().describe('URL of the flipbook thumbnail.'),
            pdfUrl: z.string().describe('URL of the source PDF.'),
            pages: z.number().describe('Number of pages in the flipbook.'),
            tags: z.string().describe('Comma-separated tags of the flipbook.'),
            created: z.string().describe('Creation date of the flipbook.')
          })
        )
        .describe('List of flipbooks.'),
      count: z.number().describe('Total number of flipbooks returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyzineClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId
    });

    let flipbooks = await client.listFlipbooks(ctx.input.search, ctx.input.tags);

    let mapped = (Array.isArray(flipbooks) ? flipbooks : []).map(fb => ({
      flipbookId: fb.id,
      title: fb.title || '',
      subtitle: fb.subtitle || '',
      description: fb.description || '',
      url: fb.url || '',
      thumbnailUrl: fb.thumbnail || '',
      pdfUrl: fb.pdf || '',
      pages: fb.pages || 0,
      tags: fb.tags || '',
      created: fb.created || ''
    }));

    return {
      output: {
        flipbooks: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** flipbook(s).`
    };
  })
  .build();
