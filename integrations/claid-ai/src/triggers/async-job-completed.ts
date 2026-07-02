import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let asyncJobCompleted = SlateTrigger.create(spec, {
  name: 'Async Job Completed',
  key: 'async_job_completed',
  description:
    'Triggered when an async processing job completes (success or error). Configure the webhook endpoint in the Claid.ai dashboard under Integrations → Webhook Settings.',
  instructions: [
    'Set the webhook endpoint URL in your Claid.ai dashboard at Integrations → Webhook Settings.',
    'Optionally set a shared secret in the dashboard for HMAC-SHA256 signature verification via the X-Claid-Hmac-SHA256 header.'
  ]
})
  .input(
    z.object({
      taskId: z.number().describe('Async task ID'),
      status: z.string().describe('Job completion status (e.g. DONE, ERROR)'),
      jobType: z.string().optional().describe('Type of job that completed'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Async task ID'),
      status: z.string().describe('Completion status (DONE or ERROR)'),
      createdAt: z.string().optional().describe('Task creation timestamp'),
      errors: z
        .array(
          z.object({
            error: z.string(),
            createdAt: z.string().optional()
          })
        )
        .optional()
        .describe('Errors if status is ERROR'),
      outputUrls: z
        .array(z.string())
        .optional()
        .describe('Output image/video URLs when available')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let data = body.data || body;

      return {
        inputs: [
          {
            taskId: data.id,
            status: data.status,
            jobType: data.request ? detectJobType(data) : undefined,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.rawPayload.data || ctx.input.rawPayload;
      let payload = data as any;

      let errors = (payload.errors || []).map((e: any) => ({
        error: e.error,
        createdAt: e.created_at
      }));

      let outputUrls: string[] = [];
      if (payload.result) {
        let outputs =
          payload.result.output_objects ||
          (payload.result.output_object ? [payload.result.output_object] : []);
        for (let o of outputs) {
          if (o.tmp_url) outputUrls.push(o.tmp_url);
          else if (o.claid_storage_uri) outputUrls.push(o.claid_storage_uri);
        }
      }

      let eventType = ctx.input.status === 'DONE' ? 'job.succeeded' : 'job.failed';

      return {
        type: eventType,
        id: `${ctx.input.taskId}-${ctx.input.status}`,
        output: {
          taskId: ctx.input.taskId,
          status: ctx.input.status,
          createdAt: payload.created_at,
          errors: errors.length > 0 ? errors : undefined,
          outputUrls: outputUrls.length > 0 ? outputUrls : undefined
        }
      };
    }
  })
  .build();

let detectJobType = (data: any): string | undefined => {
  let request = data.request;
  if (!request) return undefined;
  if (request.operations) return 'image_edit';
  if (request.input?.clothing) return 'fashion_model';
  if (request.options?.duration !== undefined) return 'video';
  if (request.object && request.scene) return 'background';
  return undefined;
};
