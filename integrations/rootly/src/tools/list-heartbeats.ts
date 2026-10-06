import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listHeartbeats = SlateTool.create(spec, {
  name: 'List Heartbeats',
  key: 'list_heartbeats',
  description: `List heartbeat monitors configured in Rootly. Heartbeats monitor system health by expecting periodic pings.
Returns heartbeat status (waiting, active, expired), interval configuration, and alert settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search heartbeats by keyword'),
      name: z.string().optional().describe('Filter by name'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      returnedCount: z.number().describe('Number of records returned in this response'),
      currentPage: z.number().optional().describe('Provider page number, when supplied'),
      totalPages: z.number().optional().describe('Provider page count, when supplied'),
      nextCursor: z
        .string()
        .optional()
        .describe('Provider continuation cursor, when supplied'),
      included: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Requested related resources'),
      heartbeats: z.array(z.record(z.string(), z.any())).describe('List of heartbeats'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listHeartbeats({
      search: ctx.input.search,
      name: ctx.input.name,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let heartbeats = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        returnedCount: heartbeats.length,
        currentPage: result.meta?.current_page,
        totalPages: result.meta?.total_pages,
        nextCursor: result.meta?.next_cursor,
        included: result.included ? flattenResources(result.included) : undefined,
        heartbeats,
        totalCount: result.meta?.total_count
      },
      message: `Found **${heartbeats.length}** heartbeats.`
    };
  })
  .build();
