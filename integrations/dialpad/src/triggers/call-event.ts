import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let callEventTrigger = SlateTrigger.create(spec, {
  name: 'Call Event',
  key: 'call_event',
  description:
    'Triggered when call lifecycle events occur (e.g., ringing, connected, ended). Supports filtering by call state and scoping to company, office, call center, department, or user.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      callState: z
        .string()
        .describe('Current state of the call (e.g., ringing, connected, hangup)'),
      callId: z.string().optional().describe('Unique call ID'),
      direction: z.string().optional().describe('Call direction (inbound/outbound)'),
      callerNumber: z.string().optional(),
      calleeNumber: z.string().optional(),
      callerUserId: z.string().optional(),
      calleeUserId: z.string().optional(),
      callerName: z.string().optional(),
      calleeName: z.string().optional(),
      targetType: z.string().optional(),
      targetId: z.string().optional(),
      duration: z.number().optional().describe('Duration in seconds'),
      recordingUrl: z.string().optional(),
      startedAt: z.string().optional(),
      rawPayload: z.any().optional()
    })
  )
  .output(
    z.object({
      callId: z.string().describe('Unique call ID'),
      callState: z.string().describe('Call state'),
      direction: z.string().optional(),
      callerNumber: z.string().optional(),
      calleeNumber: z.string().optional(),
      callerUserId: z.string().optional(),
      calleeUserId: z.string().optional(),
      callerName: z.string().optional(),
      calleeName: z.string().optional(),
      targetType: z.string().optional(),
      targetId: z.string().optional(),
      duration: z.number().optional(),
      recordingUrl: z.string().optional(),
      startedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new DialpadClient({
        token: ctx.auth.token,
        environment: ctx.auth.environment
      });

      let webhook = await client.createWebhook({
        hook_url: ctx.input.webhookBaseUrl
      });

      let subscription = await client.createCallEventSubscription({
        webhook_id: webhook.id
      });

      return {
        registrationDetails: {
          webhookId: String(webhook.id),
          subscriptionId: String(subscription.id)
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new DialpadClient({
        token: ctx.auth.token,
        environment: ctx.auth.environment
      });

      let details = ctx.input.registrationDetails as {
        webhookId: string;
        subscriptionId: string;
      };

      if (details.subscriptionId) {
        try {
          await client.deleteCallEventSubscription(details.subscriptionId);
        } catch (_e) {
          // Subscription may already be deleted
        }
      }

      if (details.webhookId) {
        try {
          await client.deleteWebhook(details.webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Dialpad may send events as single objects or arrays
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let callId = String(event.call_id || event.id || '');
        let state = event.state || event.call_state || 'unknown';

        return {
          eventId: `${callId}-${state}-${event.date_started || Date.now()}`,
          callState: state,
          callId,
          direction: event.direction,
          callerNumber: event.external_number || event.caller_number || event.from_number,
          calleeNumber: event.internal_number || event.callee_number || event.to_number,
          callerUserId: event.caller_id ? String(event.caller_id) : undefined,
          calleeUserId: event.callee_id ? String(event.callee_id) : undefined,
          callerName: event.caller_name || event.contact?.name,
          calleeName: event.callee_name,
          targetType: event.target_type || event.target?.type,
          targetId: event.target_id
            ? String(event.target_id)
            : event.target?.id
              ? String(event.target.id)
              : undefined,
          duration: event.duration,
          recordingUrl: event.recording_url,
          startedAt: event.date_started,
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `call.${ctx.input.callState}`,
        id: ctx.input.eventId,
        output: {
          callId: ctx.input.callId || '',
          callState: ctx.input.callState,
          direction: ctx.input.direction,
          callerNumber: ctx.input.callerNumber,
          calleeNumber: ctx.input.calleeNumber,
          callerUserId: ctx.input.callerUserId,
          calleeUserId: ctx.input.calleeUserId,
          callerName: ctx.input.callerName,
          calleeName: ctx.input.calleeName,
          targetType: ctx.input.targetType,
          targetId: ctx.input.targetId,
          duration: ctx.input.duration,
          recordingUrl: ctx.input.recordingUrl,
          startedAt: ctx.input.startedAt
        }
      };
    }
  })
  .build();
