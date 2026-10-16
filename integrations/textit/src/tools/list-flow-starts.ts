import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listFlowStarts = SlateTool.create(spec, {
  name: 'List Flow Starts',
  key: 'list_flow_starts',
  description: 'List manual flow starts and check asynchronous start status.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      flowStartUuid: z
        .string()
        .optional()
        .describe('Filter by flow start UUID returned by start_flow.'),
      cursor: z
        .string()
        .optional()
        .describe('Opaque nextCursor from the previous response; keep the same filters.')
    })
  )
  .output(
    z.object({
      flowStarts: z.array(
        z.object({
          flowStartUuid: z.string(),
          flowUuid: z.string(),
          flowName: z.string(),
          status: z.string(),
          createdOn: z.string()
        })
      ),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth.token);
    const result = await client.listFlowStarts({
      uuid: ctx.input.flowStartUuid,
      cursor: ctx.input.cursor
    });
    return {
      output: {
        flowStarts: result.results.map(item => ({
          flowStartUuid: item.uuid,
          flowUuid: item.flow.uuid,
          flowName: item.flow.name,
          status: item.status,
          createdOn: item.created_on
        })),
        hasMore: result.next !== null,
        nextCursor: client.nextCursor(result),
        raw: result
      },
      message: `Found **${result.results.length}** flow starts.`
    };
  })
  .build();
