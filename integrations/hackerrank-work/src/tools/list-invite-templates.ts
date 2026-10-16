import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';

import { spec } from '../spec';

export let listInviteTemplates = SlateTool.create(spec, {
  key: 'list_invite_templates',
  name: 'List Invite Templates',
  description:
    'List accessible invite templates and their IDs for creating invitations or interviews.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      access: z.enum(['owned', 'shared']).optional().describe('Template ownership'),
      limit: z.number().min(1).max(100).optional().describe('Page size, default 100'),
      offset: z.number().min(0).optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      templates: z.array(z.record(z.string(), z.any())).describe('Provider template records'),
      total: z.number().describe('Total matching templates'),
      offset: z.number().describe('Current offset'),
      next: z.string().optional().describe('Provider next-page URL'),
      raw: z.record(z.string(), z.any()).describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listInviteTemplates(ctx.input);
    return {
      message: 'List invite templates completed.',
      output: {
        templates: result.data,
        total: result.total,
        offset: result.offset,
        next: result.next,
        raw: result.raw!
      }
    };
  });
