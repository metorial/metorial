import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTechnologyChanges = SlateTool.create(spec, {
  name: 'Get Technology Changes',
  key: 'get_technology_changes',
  description:
    'Retrieve recent technology additions and removals for a website, including change dates, categories, and business context.',
  constraints: ['Uses one API credit when the domain has changes in the requested window.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().min(1).describe('Root domain to inspect, such as example.com'),
      since: z
        .string()
        .optional()
        .describe('Start of the change window, such as YYYY-MM-DD or last month')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Domain lookup results with change summaries and technology events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.changes(ctx.input.domain, ctx.input.since);
    return {
      output: { results: data?.Results ?? [] },
      message: `Retrieved technology changes for **${ctx.input.domain}**.`
    };
  });
