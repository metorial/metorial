import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSessions = SlateTool.create(spec, {
  name: 'Get Sessions',
  key: 'get_sessions',
  description: `Retrieve all tracked visitor sessions for a specific domain. Provides a paginated list of sessions including visitor data, metadata, and tracking information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('Domain tracker ID to retrieve sessions for'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of sessions per page')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of sessions for this domain'),
      nextPage: z.string().nullable().describe('URL for the next page of results'),
      previousPage: z.string().nullable().describe('URL for the previous page of results'),
      sessions: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of session data objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSessions(
      ctx.input.domainId,
      ctx.input.page,
      ctx.input.pageSize
    );

    return {
      output: {
        count: result.count,
        nextPage: result.next,
        previousPage: result.previous,
        sessions: result.results
      },
      message: `Retrieved **${result.results.length}** sessions (${result.count} total) for domain \`${ctx.input.domainId}\`.`
    };
  })
  .build();
