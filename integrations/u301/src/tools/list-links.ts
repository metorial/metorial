import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listLinksSchema, workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listLinks = SlateTool.create(spec, {
  name: 'List Links',
  key: 'list_links',
  description:
    'List a page of short links in a workspace with destinations, click counts and pagination metadata. Call list_workspaces to discover workspace IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      page: z.number().optional().describe('Positive whole page number; defaults to 1.'),
      perPage: z
        .number()
        .optional()
        .describe('Positive whole number of links per page; the provider defaults to 10.')
    })
  )
  .output(listLinksSchema)
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).listLinks(ctx.input);
    return {
      output,
      message: `Retrieved **${output.links.length}** link(s) on page ${output.metadata.page}; ${output.metadata.total} total.`
    };
  })
  .build();
