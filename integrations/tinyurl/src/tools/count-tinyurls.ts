import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listFiltersSchema } from '../lib/schemas';
import { spec } from '../spec';

export let countTinyUrls = SlateTool.create(spec, {
  name: 'Count TinyURLs',
  key: 'count_tinyurls',
  description:
    'Count available or archived TinyURLs on your account, optionally filtered by creation date, alias, or tag. Use this for totals without retrieving individual links.',
  tags: { destructive: false, readOnly: true }
})
  .input(listFiltersSchema)
  .output(
    z.object({
      status: z.enum(['available', 'archived']).describe('Link status counted'),
      count: z.number().describe('Number of links matching the filters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let count = await client.countTinyUrls({
      type: ctx.input.status,
      from: ctx.input.from,
      to: ctx.input.to,
      search: ctx.input.search
    });
    return {
      output: { status: ctx.input.status, count },
      message: `Found **${count}** ${ctx.input.status} TinyURL(s)`
    };
  })
  .build();
