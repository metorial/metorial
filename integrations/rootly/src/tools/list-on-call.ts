import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listOnCall = SlateTool.create(spec, {
  name: 'List On-Call',
  key: 'list_on_call',
  description: `List who is currently on call. Returns active on-call assignments across schedules and escalation policies.
Use this to find who is responsible for responding to incidents right now. Pagination slices the current assignments locally; the API returns the full collection.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
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
      onCalls: z
        .array(z.record(z.string(), z.any()))
        .describe('List of current on-call assignments'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listOnCalls({
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let onCalls = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        returnedCount: onCalls.length,
        currentPage: result.meta?.current_page,
        totalPages: result.meta?.total_pages,
        nextCursor: result.meta?.next_cursor,
        included: result.included ? flattenResources(result.included) : undefined,
        onCalls,
        totalCount: result.meta?.total_count
      },
      message: `Found **${onCalls.length}** on-call assignments.`
    };
  })
  .build();
