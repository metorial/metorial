import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { statusPageSchema } from '../lib/types';
import { spec } from '../spec';

export let updateStatusPage = SlateTool.create(spec, {
  name: 'Update Status Page',
  key: 'update_status_page',
  description: `Update an existing status page's configuration including its name, description, visibility, displayed checks, and access key. Only provided fields are updated.`
})
  .input(
    z.object({
      statusPageToken: z
        .string()
        .describe('The unique token identifier of the status page to update'),
      name: z.string().optional().describe('New name for the status page'),
      description: z.string().optional().describe('New description'),
      visibility: z
        .enum(['public', 'protected', 'private'])
        .optional()
        .describe('New visibility setting'),
      checks: z.array(z.string()).optional().describe('Updated ordered list of check tokens'),
      accessKey: z.string().optional().describe('New access key for protected pages')
    })
  )
  .output(statusPageSchema)
  .handleInvocation(async ctx => {
    let { statusPageToken, ...updateData } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let page = await client.updateStatusPage(statusPageToken, updateData);

    return {
      output: page,
      message: `Updated status page **${page.name || 'Untitled'}** (token: \`${page.statusPageToken}\`).`
    };
  })
  .build();
