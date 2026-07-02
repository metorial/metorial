import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { twilioSendGridServiceError } from '../lib/errors';
import { spec } from '../spec';

let scheduledSendSchema = z.object({
  batchId: z.string().optional().describe('Mail batch ID'),
  status: z.string().optional().describe('Scheduled-send status')
});

let mapScheduledSend = (entry: any) => {
  let value = entry || {};
  return {
    batchId: value.batch_id || undefined,
    status: value.status || undefined
  };
};

let scheduledSendEntriesFor = (result: any) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.result)) return result.result;
  if (Array.isArray(result?.scheduled_sends)) return result.scheduled_sends;
  return [];
};

export let manageScheduledSends = SlateTool.create(spec, {
  name: 'Manage Scheduled Sends',
  key: 'manage_scheduled_sends',
  description: `Create and validate mail batch IDs, list scheduled send statuses, and pause, cancel, update, or clear pause/cancel statuses for scheduled SendGrid mail sends.`,
  instructions: [
    'Use create_batch before scheduling mail that may need to be paused or canceled.',
    'Pass the returned batchId to send_email along with sendAt.',
    'SendGrid only returns scheduled sends that have a batchId and are currently paused or canceled.'
  ],
  constraints: [
    'SendGrid cannot pause or cancel more than 10 batches at a time.',
    'A scheduled send cannot be paused or canceled later than 10 minutes before sendAt.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create_batch',
          'validate_batch',
          'list',
          'get',
          'pause',
          'cancel',
          'update_status',
          'clear_status'
        ])
        .describe('Scheduled-send operation to perform'),
      batchId: z
        .string()
        .optional()
        .describe(
          'Batch ID. Required for validate_batch, get, pause, cancel, update_status, and clear_status.'
        ),
      status: z.enum(['pause', 'cancel']).optional().describe('New status for update_status')
    })
  )
  .output(
    z.object({
      batchId: z.string().optional().describe('Batch ID returned by SendGrid'),
      status: z.string().optional().describe('Scheduled-send status'),
      scheduledSends: z
        .array(scheduledSendSchema)
        .optional()
        .describe('Scheduled-send status entries'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let requireBatchId = () => {
      if (!ctx.input.batchId) {
        throw twilioSendGridServiceError(`batchId is required for ${ctx.input.action}.`);
      }
      return ctx.input.batchId;
    };

    switch (ctx.input.action) {
      case 'create_batch': {
        let result = await client.createBatchId();
        return {
          output: { batchId: result.batch_id, success: true },
          message: `Created mail batch ID ${result.batch_id}.`
        };
      }
      case 'validate_batch': {
        let batchId = requireBatchId();
        let result = await client.validateBatchId(batchId);
        return {
          output: { batchId: result.batch_id || batchId, success: true },
          message: `Validated mail batch ID ${result.batch_id || batchId}.`
        };
      }
      case 'list': {
        let result = await client.getScheduledSends();
        let scheduledSends = scheduledSendEntriesFor(result).map(mapScheduledSend);
        return {
          output: { scheduledSends, success: true },
          message: `Retrieved **${scheduledSends.length}** scheduled send status entr${scheduledSends.length === 1 ? 'y' : 'ies'}.`
        };
      }
      case 'get': {
        let batchId = requireBatchId();
        let result = await client.getScheduledSend(batchId);
        let scheduledSends = (
          scheduledSendEntriesFor(result).length > 0
            ? scheduledSendEntriesFor(result)
            : [result]
        ).map(mapScheduledSend);
        return {
          output: { batchId, scheduledSends, success: true },
          message: `Retrieved scheduled send status for batch ${batchId}.`
        };
      }
      case 'pause':
      case 'cancel': {
        let batchId = requireBatchId();
        let result = await client.createScheduledSendStatus(batchId, ctx.input.action);
        return {
          output: {
            batchId: result.batch_id || batchId,
            status: result.status || ctx.input.action,
            success: true
          },
          message: `${ctx.input.action === 'pause' ? 'Paused' : 'Canceled'} scheduled send batch ${batchId}.`
        };
      }
      case 'update_status': {
        let batchId = requireBatchId();
        if (!ctx.input.status) {
          throw twilioSendGridServiceError('status is required for update_status.');
        }
        let result = await client.updateScheduledSendStatus(batchId, ctx.input.status);
        return {
          output: {
            batchId: result.batch_id || batchId,
            status: result.status || ctx.input.status,
            success: true
          },
          message: `Updated scheduled send batch ${batchId} to ${ctx.input.status}.`
        };
      }
      case 'clear_status': {
        let batchId = requireBatchId();
        await client.clearScheduledSendStatus(batchId);
        return {
          output: { batchId, success: true },
          message: `Cleared pause/cancel status for scheduled send batch ${batchId}.`
        };
      }
    }
  })
  .build();
