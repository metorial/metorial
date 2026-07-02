import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateBulkSendState = SlateTool.create(spec, {
  name: 'Update Bulk Send State',
  key: 'update_bulk_send_state',
  description: `Update a Send in Bulk (MegaSign) parent agreement state, primarily to cancel an in-progress bulk send.`,
  instructions: ['Use CANCELLED to recall an in-progress Send in Bulk operation.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      bulkSendId: z.string().describe('ID of the Send in Bulk parent agreement'),
      state: z.enum(['IN_PROCESS', 'CANCELLED']).describe('Target state'),
      cancellationComment: z
        .string()
        .optional()
        .describe('Comment explaining why the bulk send is being cancelled'),
      notifyOthers: z
        .boolean()
        .optional()
        .describe('Whether to notify participants about the cancellation. Defaults to true.')
    })
  )
  .output(
    z.object({
      bulkSendId: z.string().describe('ID of the updated Send in Bulk operation'),
      state: z.string().describe('Requested new state')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    await client.updateMegaSignState(ctx.input.bulkSendId, ctx.input.state, {
      cancellationInfo:
        ctx.input.cancellationComment || ctx.input.notifyOthers !== undefined
          ? {
              comment: ctx.input.cancellationComment,
              notifyOthers: ctx.input.notifyOthers ?? true
            }
          : undefined
    });

    return {
      output: {
        bulkSendId: ctx.input.bulkSendId,
        state: ctx.input.state
      },
      message: `Send in Bulk \`${ctx.input.bulkSendId}\` state update requested: **${ctx.input.state}**.`
    };
  });
