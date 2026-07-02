import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let _eventTypes = [
  'bulk_job.completed',
  'tps_status.changed',
  'credits.running_low',
  'usage_limit.approaching',
  'subscription.changed'
] as const;

export let tpscheckEvents = SlateTrigger.create(spec, {
  name: 'TPSCheck Events',
  key: 'tpscheck_events',
  description:
    'Receives webhook notifications from TPSCheck for bulk job completions, TPS/CTPS status changes, credit alerts, usage limit warnings, and subscription changes. Configure the webhook URL in the TPSCheck dashboard.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the event'),
      eventId: z.string().describe('Unique identifier for the event'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Phone number associated with the event (if applicable)'),
      tpsRegistered: z
        .boolean()
        .optional()
        .describe('TPS registration status (for status change events)'),
      ctpsRegistered: z
        .boolean()
        .optional()
        .describe('CTPS registration status (for status change events)'),
      creditsRemaining: z
        .number()
        .optional()
        .describe('Remaining credits (for credit alert events)'),
      monthlyLimit: z.number().optional().describe('Monthly limit (for usage limit events)'),
      requestsUsed: z.number().optional().describe('Requests used (for usage limit events)'),
      plan: z.string().optional().describe('Plan name (for subscription events)'),
      batchJobId: z.string().optional().describe('Batch job ID (for bulk job events)'),
      totalChecked: z
        .number()
        .optional()
        .describe('Total numbers checked (for bulk job events)'),
      timestamp: z.string().optional().describe('Event timestamp in ISO 8601 format'),
      rawPayload: z.any().optional().describe('Full raw event payload from TPSCheck')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Type of event received'),
      phoneNumber: z.string().optional().describe('Phone number associated with the event'),
      tpsRegistered: z.boolean().optional().describe('TPS registration status'),
      ctpsRegistered: z.boolean().optional().describe('CTPS registration status'),
      creditsRemaining: z.number().optional().describe('Remaining API credits'),
      monthlyLimit: z.number().optional().describe('Monthly credit limit'),
      requestsUsed: z.number().optional().describe('API requests used this period'),
      plan: z.string().optional().describe('Current plan name'),
      batchJobId: z.string().optional().describe('Batch job identifier'),
      totalChecked: z.number().optional().describe('Total numbers checked in batch'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let eventType = data.event || data.type || 'unknown';
      let eventId = data.id || data.event_id || `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            phoneNumber: data.phone || data.phone_number || data.e164,
            tpsRegistered: data.tps,
            ctpsRegistered: data.ctps,
            creditsRemaining: data.credits_remaining ?? data.requests_remaining,
            monthlyLimit: data.monthly_limit,
            requestsUsed: data.requests_used,
            plan: data.plan,
            batchJobId: data.batch_id ?? data.job_id,
            totalChecked: data.total ?? data.total_checked,
            timestamp: data.timestamp ?? data.created_at,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let normalizedType = normalizeEventType(ctx.input.eventType);

      return {
        type: normalizedType,
        id: ctx.input.eventId,
        output: {
          eventType: normalizedType,
          phoneNumber: ctx.input.phoneNumber,
          tpsRegistered: ctx.input.tpsRegistered,
          ctpsRegistered: ctx.input.ctpsRegistered,
          creditsRemaining: ctx.input.creditsRemaining,
          monthlyLimit: ctx.input.monthlyLimit,
          requestsUsed: ctx.input.requestsUsed,
          plan: ctx.input.plan,
          batchJobId: ctx.input.batchJobId,
          totalChecked: ctx.input.totalChecked,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();

let normalizeEventType = (eventType: string): string => {
  let mapping: Record<string, string> = {
    bulk_job_completed: 'bulk_job.completed',
    batch_completed: 'bulk_job.completed',
    tps_status_changed: 'tps_status.changed',
    status_changed: 'tps_status.changed',
    credits_running_low: 'credits.running_low',
    credits_low: 'credits.running_low',
    usage_limit_approaching: 'usage_limit.approaching',
    usage_approaching: 'usage_limit.approaching',
    subscription_changed: 'subscription.changed',
    plan_changed: 'subscription.changed'
  };

  return mapping[eventType] || eventType;
};
