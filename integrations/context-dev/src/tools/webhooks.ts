import { pickDefined } from 'slates';
import { z } from 'zod';
import { ContextClient, pathId } from '../lib/client';
import { responseMetadata } from '../lib/response';
import { contextTool } from '../lib/tools';

const webhookErrorSchema = z.object({ code: z.string(), message: z.string() }).passthrough();
const attemptSchema = z
  .object({
    attempt: z.number().int(),
    trigger: z.enum(['initial', 'automatic', 'manual']),
    url: z.string(),
    started_at: z.string(),
    completed_at: z.string().nullable(),
    http_status: z.number().int().nullable(),
    error: webhookErrorSchema.nullable()
  })
  .passthrough();

const deliverySummarySchema = z
  .object({
    id: z.string(),
    event: z.enum([
      'batch.completed',
      'batch.failed',
      'batch.cancelled',
      'change.detected',
      'run.completed'
    ]),
    source: z
      .object({
        type: z.enum(['batch', 'monitor']),
        batch_id: z.string().optional(),
        monitor_id: z.string().optional(),
        run_id: z.string().optional()
      })
      .passthrough(),
    url: z.string(),
    status: z.enum(['pending', 'delivering', 'retrying', 'delivered', 'failed', 'cancelled']),
    created_at: z.string(),
    retry_expires_at: z.string(),
    delivered_at: z.string().nullable(),
    next_attempt_at: z.string().nullable(),
    last_error: webhookErrorSchema.nullable()
  })
  .passthrough();

const listDeliveriesSchema = z
  .object({
    data: z.array(deliverySummarySchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    ...responseMetadata
  })
  .passthrough();

const listDeliveries = contextTool('list-webhook-deliveries')
  .output(listDeliveriesSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof listDeliveriesSchema>
    >('list webhook deliveries', {
      method: 'POST',
      path: '/webhooks/deliveries',
      body: ctx.input.body
    });
    return { output, message: `Retrieved ${output.data.length} webhook deliveries.` };
  })
  .build();

const deliverySchema = deliverySummarySchema.extend({
  event_id: z.string(),
  retry: z
    .object({
      delays_seconds: z.array(z.number().int()).optional()
    })
    .passthrough(),
  last_attempt: attemptSchema.nullable(),
  ...responseMetadata
});

const getDelivery = contextTool('get-webhook-delivery')
  .output(deliverySchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof deliverySchema>
    >('retrieve webhook delivery', {
      method: 'GET',
      path: `/webhooks/deliveries/${pathId(ctx.input.delivery_id)}`,
      query: pickDefined({ tags: ctx.input.tags })
    });
    return {
      output,
      message: `Retrieved webhook delivery ${output.id} with status ${output.status}.`
    };
  })
  .build();

const listAttemptsSchema = z
  .object({
    data: z.array(attemptSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    ...responseMetadata
  })
  .passthrough();

const listAttempts = contextTool('list-webhook-delivery-attempts')
  .output(listAttemptsSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof listAttemptsSchema>
    >('list webhook delivery attempts', {
      method: 'GET',
      path: `/webhooks/deliveries/${pathId(ctx.input.delivery_id)}/attempts`,
      query: pickDefined({
        limit: ctx.input.limit,
        cursor: ctx.input.cursor,
        tags: ctx.input.tags
      })
    });
    return { output, message: `Retrieved ${output.data.length} webhook delivery attempts.` };
  })
  .build();

const retryDeliverySchema = z.object({ id: z.string(), ...responseMetadata }).passthrough();
const retryDelivery = contextTool('retry-webhook-delivery')
  .output(retryDeliverySchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof retryDeliverySchema>
    >('retry webhook delivery', {
      method: 'POST',
      path: `/webhooks/deliveries/${pathId(ctx.input.delivery_id)}/retry`,
      headers:
        ctx.input['Idempotency-Key'] === undefined
          ? undefined
          : {
              'Idempotency-Key': String(ctx.input['Idempotency-Key'])
            },
      body: pickDefined({ force: ctx.input.force, tags: ctx.input.tags })
    });
    return { output, message: `Queued another attempt for webhook delivery ${output.id}.` };
  })
  .build();

export const webhookTools = [listDeliveries, getDelivery, listAttempts, retryDelivery];
