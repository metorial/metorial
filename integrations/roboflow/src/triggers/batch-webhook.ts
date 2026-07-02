import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let batchWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Batch Processing Webhook',
  key: 'batch_webhook',
  description:
    'Receives webhook notifications for batch data ingestion status updates and batch job completion events from Roboflow.'
})
  .input(
    z.object({
      eventCategory: z
        .string()
        .describe('Category of the event (e.g., ingest-status, job-completion)'),
      eventId: z.string().describe('Unique event identifier'),
      status: z.string().optional().describe('Status of the batch operation'),
      batchId: z.string().optional().describe('Batch identifier'),
      successCount: z.number().optional().describe('Number of successfully processed items'),
      failureCount: z.number().optional().describe('Number of failed items'),
      rawPayload: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      batchId: z.string().optional().describe('Batch identifier'),
      status: z.string().optional().describe('Status of the batch operation'),
      successCount: z.number().optional().describe('Number of successfully processed items'),
      failureCount: z.number().optional().describe('Number of failed items')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let eventCategory = body.category || body.type || 'batch_event';
      let eventId = body.id || body.event_id || `${eventCategory}-${Date.now()}`;
      let status = body.status;
      let batchId = body.batch_id || body.batchId;
      let successCount = body.success_count ?? body.successCount;
      let failureCount = body.failure_count ?? body.failureCount;

      return {
        inputs: [
          {
            eventCategory,
            eventId,
            status,
            batchId,
            successCount,
            failureCount,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `batch.${ctx.input.eventCategory}`,
        id: ctx.input.eventId,
        output: {
          batchId: ctx.input.batchId,
          status: ctx.input.status,
          successCount: ctx.input.successCount,
          failureCount: ctx.input.failureCount
        }
      };
    }
  })
  .build();
