import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let getBulkDeleteStatus = SlateTool.create(spec, {
  name: 'Get Bulk Delete Status',
  key: 'get_bulk_delete_status',
  description: `List outstanding Pendo bulk deletion requests or retrieve the preserved status receipt for a specific deletion request ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      requestId: z
        .string()
        .optional()
        .describe('Specific bulk deletion request ID. Omit to list outstanding requests.')
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('Requested bulk deletion ID'),
      requests: z.array(z.any()).optional().describe('Outstanding deletion requests'),
      status: z.any().optional().describe('Single deletion request status'),
      raw: z.any().describe('Raw Pendo bulk deletion status response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);
    let result = await client.getBulkDeleteStatus(ctx.input.requestId);

    let requests = Array.isArray(result) ? result : undefined;

    return {
      output: {
        requestId: ctx.input.requestId,
        requests,
        status: ctx.input.requestId ? result : undefined,
        raw: result
      },
      message: ctx.input.requestId
        ? `Retrieved Pendo bulk deletion status for **${ctx.input.requestId}**.`
        : `Found **${requests?.length ?? 0}** outstanding Pendo bulk deletion request(s).`
    };
  })
  .build();
