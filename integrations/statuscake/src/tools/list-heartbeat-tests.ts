import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextPage } from '../lib/client';
import { spec } from '../spec';

export let listHeartbeatTests = SlateTool.create(spec, {
  name: 'List Heartbeat Tests',
  key: 'list_heartbeat_tests',
  description: `List all heartbeat monitoring checks on your StatusCake account. Heartbeat checks provide a unique URL that your service must ping within a configured period. Returns check configuration, status, and heartbeat URL.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      status: z.enum(['up', 'down']).optional().describe('Filter by current status'),
      tags: z.string().optional().describe('Comma-separated list of tags to filter by'),
      matchAny: z
        .boolean()
        .optional()
        .describe('Match any supplied tag rather than every tag'),
      noUptime: z.boolean().optional().describe('Omit uptime percentage calculation'),
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Number of results per page, between 1 and 100')
    })
  )
  .output(
    z.object({
      tests: z.array(z.record(z.string(), z.any())).describe('List of heartbeat test objects'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Provider pagination metadata'),
      nextPage: z.number().optional().describe('Next page number, when more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listHeartbeatTests({
      status: ctx.input.status,
      tags: ctx.input.tags,
      matchany: ctx.input.matchAny,
      nouptime: ctx.input.noUptime,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let tests = result.data;

    return {
      output: { tests, metadata: result.metadata, nextPage: nextPage(result.metadata) },
      message: `Found **${tests.length}** heartbeat test(s).`
    };
  })
  .build();
