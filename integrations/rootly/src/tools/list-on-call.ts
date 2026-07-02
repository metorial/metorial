import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listOnCall = SlateTool.create(spec, {
  name: 'List On-Call',
  key: 'list_on_call',
  description: `List who is currently on call. Returns active on-call assignments across schedules and escalation policies.
Use this to find who is responsible for responding to incidents right now.`,
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
        onCalls,
        totalCount: result.meta?.total_count
      },
      message: `Found **${onCalls.length}** on-call assignments.`
    };
  })
  .build();
