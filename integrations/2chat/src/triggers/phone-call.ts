import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let phoneCallTrigger = SlateTrigger.create(spec, {
  name: 'Phone Call Event',
  key: 'phone_call_event',
  description:
    'Triggers on phone call lifecycle events: status updates, incoming call completions, and outbound call completions.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of phone call event'),
      eventId: z.string().describe('Unique identifier for this event'),
      callUuid: z.string().optional().describe('UUID of the call'),
      fromNumber: z.string().optional().describe('Caller phone number'),
      toNumber: z.string().optional().describe('Callee phone number'),
      onNumber: z.string().optional().describe('Connected phone number'),
      callStatus: z
        .string()
        .optional()
        .describe('Call status (ringing, answered, ended, missed, failed)'),
      callDirection: z.string().optional().describe('Call direction (inbound/outbound)'),
      duration: z.number().optional().describe('Call duration in seconds'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      callUuid: z.string().optional().describe('UUID of the call'),
      fromNumber: z.string().optional().describe('Caller phone number'),
      toNumber: z.string().optional().describe('Callee phone number'),
      onNumber: z.string().optional().describe('Connected phone number'),
      callStatus: z.string().optional().describe('Call status'),
      callDirection: z.string().optional().describe('Call direction'),
      duration: z.number().optional().describe('Call duration in seconds'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TwoChatClient({ token: ctx.auth.token });

      let callerIdsResult = await client.listCallerIds();
      let callerIds = callerIdsResult.caller_ids || callerIdsResult.data || [];

      let events = [
        'call.status.update',
        'call.incoming.completed',
        'call.outbound.completed'
      ];

      let registrations: Array<{ webhookUuid: string; event: string; onNumber: string }> = [];

      for (let callerId of callerIds) {
        let phoneNumber = callerId.phone_number || callerId.number;
        if (!phoneNumber) continue;

        for (let event of events) {
          try {
            let result = await client.subscribePhoneCallWebhook({
              hookUrl: ctx.input.webhookBaseUrl,
              onNumber: phoneNumber,
              event
            });
            registrations.push({
              webhookUuid: result.uuid || result.webhook_uuid || result.id,
              event,
              onNumber: phoneNumber
            });
          } catch (_e) {
            // Some events may not be supported for all number types
          }
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TwoChatClient({ token: ctx.auth.token });
      let registrations = ctx.input.registrationDetails?.registrations || [];

      for (let reg of registrations) {
        try {
          if (reg.webhookUuid) {
            await client.deleteWebhook(reg.webhookUuid);
          }
        } catch (_e) {
          // Best-effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.type || '';
      let call = data.call || data.payload || data;

      return {
        inputs: [
          {
            eventType,
            eventId: call.uuid || call.call_uuid || call.id || `${eventType}-${Date.now()}`,
            callUuid: call.uuid || call.call_uuid || call.id,
            fromNumber: call.from_number || call.from || data.from_number,
            toNumber: call.to_number || call.to || data.to_number,
            onNumber: data.on_number || data.channel_number,
            callStatus: call.status || call.call_status,
            callDirection: call.direction || call.call_direction,
            duration: call.duration || call.call_duration,
            timestamp: call.timestamp || call.created_at || data.timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventMap: Record<string, string> = {
        'call.status.update': 'phone_call.status_update',
        'call.incoming.completed': 'phone_call.incoming_completed',
        'call.outbound.completed': 'phone_call.outbound_completed'
      };

      return {
        type:
          eventMap[ctx.input.eventType] ||
          `phone_call.${ctx.input.eventType.split('.').pop()}`,
        id: ctx.input.eventId,
        output: {
          callUuid: ctx.input.callUuid,
          fromNumber: ctx.input.fromNumber,
          toNumber: ctx.input.toNumber,
          onNumber: ctx.input.onNumber,
          callStatus: ctx.input.callStatus,
          callDirection: ctx.input.callDirection,
          duration: ctx.input.duration,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
