import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUptimeTests = SlateTool.create(spec, {
  name: 'List Uptime Tests',
  key: 'list_uptime_tests',
  description: `List all uptime monitoring checks on your StatusCake account. Supports filtering by status and tags. Returns check configuration including test type, URL, check rate, status, and regions.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      status: z.enum(['up', 'down']).optional().describe('Filter by current status'),
      tags: z.string().optional().describe('Comma-separated list of tags to filter by'),
      matchAny: z.boolean().optional().describe('If true, match any tag rather than all tags'),
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      tests: z.array(z.record(z.string(), z.any())).describe('List of uptime test objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listUptimeTests({
      status: ctx.input.status,
      tags: ctx.input.tags,
      matchany: ctx.input.matchAny,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let tests = result?.data ?? [];

    return {
      output: { tests },
      message: `Found **${tests.length}** uptime test(s).`
    };
  })
  .build();
