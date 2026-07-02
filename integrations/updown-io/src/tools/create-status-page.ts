import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { statusPageSchema } from '../lib/types';
import { spec } from '../spec';

export let createStatusPage = SlateTool.create(spec, {
  name: 'Create Status Page',
  key: 'create_status_page',
  description: `Create a new status page that aggregates multiple monitoring checks into a single view. Supports public, protected (requires access key), and private visibility modes.`
})
  .input(
    z.object({
      name: z.string().optional().describe('Name of the status page'),
      description: z.string().optional().describe('Description displayed on the status page'),
      visibility: z
        .enum(['public', 'protected', 'private'])
        .optional()
        .describe('Visibility: public, protected (requires access key), or private'),
      checks: z
        .array(z.string())
        .describe('Ordered list of check tokens to display on the page'),
      accessKey: z
        .string()
        .optional()
        .describe('Access key required for protected status pages')
    })
  )
  .output(statusPageSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let page = await client.createStatusPage(ctx.input);

    return {
      output: page,
      message: `Created status page **${page.name || 'Untitled'}** (token: \`${page.statusPageToken}\`) with ${ctx.input.checks.length} check(s).`
    };
  })
  .build();
