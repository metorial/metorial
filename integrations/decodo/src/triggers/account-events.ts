import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let normalizeEventType = (rawType: string): string => {
  let type = rawType.toLowerCase().replace(/[\s-]+/g, '_');

  let eventMap: Record<string, string> = {
    failed_payment: 'payment.failed',
    payment_failed: 'payment.failed',
    pre_billing_alert: 'payment.pre_billing',
    pre_billing: 'payment.pre_billing',
    auto_top_up_failed: 'payment.auto_topup_failed',
    usage_threshold: 'usage.threshold_reached',
    usage_80: 'usage.threshold_reached',
    usage_100: 'usage.threshold_reached',
    trial_started: 'subscription.trial_started',
    trial_expiring: 'subscription.trial_expiring',
    subscription_expired: 'subscription.expired',
    auto_charge_success: 'payg.auto_charge_success',
    auto_charge_failed: 'payg.auto_charge_failed',
    cancellation_success: 'payg.cancellation_success',
    account_blocked: 'account.blocked'
  };

  return eventMap[type] || type;
};

export let accountEvents = SlateTrigger.create(spec, {
  name: 'Account Events',
  key: 'account_events',
  description: `Receive webhook notifications for Smartproxy/Decodo account events including payment failures, billing alerts, traffic usage thresholds, subscription changes, and account status. Configure the webhook URL in the Decodo dashboard under Account Settings > Webhooks.`,
  instructions: [
    'Configure the webhook URL in the Decodo dashboard: Account Settings > Webhooks.',
    'Select which event types to receive (payments, traffic usage, subscriptions, etc.).',
    'The webhook URL provided by Slates should be entered as the destination URL in the dashboard.'
  ]
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the account event'),
      eventData: z.record(z.string(), z.any()).describe('Event payload data from Decodo'),
      receivedAt: z.string().describe('Timestamp when the event was received')
    })
  )
  .output(
    z.object({
      eventType: z
        .string()
        .describe('Categorized event type (e.g. payment.failed, usage.threshold_reached)'),
      message: z.string().optional().describe('Human-readable event message'),
      username: z.string().optional().describe('Associated username if applicable'),
      usagePercent: z
        .number()
        .optional()
        .describe('Usage percentage if this is a usage threshold event'),
      subscriptionType: z
        .string()
        .optional()
        .describe('Subscription or service type if applicable'),
      rawPayload: z.record(z.string(), z.any()).describe('Full raw event payload')
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

      let eventType = body.event_type || body.type || body.event || 'unknown';
      let receivedAt = new Date().toISOString();

      let events = Array.isArray(body) ? body : [body];

      let inputs = events.map((event: any) => ({
        eventType: String(event.event_type || event.type || event.event || eventType),
        eventData: event as Record<string, any>,
        receivedAt
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let rawType = ctx.input.eventType;
      let data = ctx.input.eventData;

      let normalizedType = normalizeEventType(rawType);
      let eventId = String(
        data.id || data.event_id || `${normalizedType}-${ctx.input.receivedAt}`
      );

      return {
        type: normalizedType,
        id: eventId,
        output: {
          eventType: normalizedType,
          message:
            data.message != null
              ? String(data.message)
              : data.description != null
                ? String(data.description)
                : undefined,
          username:
            data.username != null
              ? String(data.username)
              : data.user != null
                ? String(data.user)
                : undefined,
          usagePercent:
            typeof data.usage_percent === 'number'
              ? data.usage_percent
              : typeof data.usage_percentage === 'number'
                ? data.usage_percentage
                : undefined,
          subscriptionType:
            data.service_type != null
              ? String(data.service_type)
              : data.subscription_type != null
                ? String(data.subscription_type)
                : undefined,
          rawPayload: data
        }
      };
    }
  })
  .build();
