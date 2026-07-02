import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let POLL_INTERVAL_SECONDS = 300; // 5 minutes (API rate limit: 1 request per 3 minutes)

export let notificationError = SlateTrigger.create(spec, {
  name: 'Notification Delivery Error',
  key: 'notification_error',
  description:
    'Triggers when an email or SMS notification fails to deliver. Detects bounce, block, spam, invalid email, and deferred delivery events.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Error event type (hard_bounce, soft_bounce, blocked, spam, invalid_email, deferred)'
        ),
      email: z.string().optional().describe('Affected email address'),
      mobile: z.string().optional().describe('Affected mobile number'),
      documentId: z.string().optional().describe('Related document ID'),
      reason: z.string().optional().describe('Human-readable error reason'),
      rawEvent: z.any().describe('Full raw event from OKSign')
    })
  )
  .output(
    z.object({
      eventType: z
        .string()
        .describe(
          'Error event type (hard_bounce, soft_bounce, blocked, spam, invalid_email, deferred)'
        ),
      email: z.string().optional().describe('Affected email address'),
      mobile: z.string().optional().describe('Affected mobile number'),
      documentId: z.string().optional().describe('Related document ID'),
      reason: z.string().optional().describe('Human-readable error reason')
    })
  )
  .polling({
    options: {
      intervalInSeconds: POLL_INTERVAL_SECONDS
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let now = new Date();
      let lastPollTime = ctx.state?.lastPollTime
        ? (ctx.state.lastPollTime as string)
        : new Date(now.getTime() - POLL_INTERVAL_SECONDS * 1000).toISOString();

      let toTime = now.toISOString();

      let errors = await client.getWebhookErrors(lastPollTime, toTime);

      return {
        inputs: errors.map((err: any, _index: number) => ({
          eventType: err.event || err.type || 'unknown',
          email: err.email,
          mobile: err.mobile,
          documentId: err.docid || err.document_id,
          reason: err.reason || err.message,
          rawEvent: err
        })),
        updatedState: {
          lastPollTime: toTime
        }
      };
    },

    handleEvent: async ctx => {
      let uniqueId = `${ctx.input.eventType}-${ctx.input.email || ctx.input.mobile || ''}-${ctx.input.documentId || ''}-${Date.now()}`;

      return {
        type: `notification.${ctx.input.eventType}`,
        id: uniqueId,
        output: {
          eventType: ctx.input.eventType,
          email: ctx.input.email,
          mobile: ctx.input.mobile,
          documentId: ctx.input.documentId,
          reason: ctx.input.reason
        }
      };
    }
  })
  .build();
