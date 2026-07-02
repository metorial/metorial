import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDesigns = SlateTool.create(spec, {
  name: 'List Designs',
  key: 'list_designs',
  description: `List available certificate and badge design templates with pagination. Designs are created in the Certifier dashboard; this provides read-only access to browse them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of designs per page (default: 20)'),
      cursor: z.string().optional().describe('Pagination cursor for fetching the next page')
    })
  )
  .output(
    z.object({
      designs: z
        .array(
          z.object({
            designId: z.string().describe('ID of the design'),
            name: z.string().describe('Name of the design'),
            type: z.string().describe('Type of design (e.g. certificate, badge)'),
            previewUrl: z.string().describe('URL to the design preview image'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of designs'),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDesigns(ctx.input.limit, ctx.input.cursor);

    let designs = result.data.map(d => ({
      designId: d.id,
      name: d.name,
      type: d.type,
      previewUrl: d.previewUrl,
      createdAt: d.createdAt
    }));

    return {
      output: {
        designs,
        nextCursor: result.pagination.next,
        prevCursor: result.pagination.prev
      },
      message: `Retrieved **${designs.length}** design(s).${result.pagination.next ? ' More results available.' : ''}`
    };
  })
  .build();
