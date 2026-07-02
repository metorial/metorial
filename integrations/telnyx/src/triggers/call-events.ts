import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let callEvents = SlateTrigger.create(spec, {
  name: 'Call Events',
  key: 'call_events',
  description:
    'Receive webhook events for voice call lifecycle events including call initiated, answered, bridged, hangup, DTMF received, recording saved, and more. Configure the webhook URL on a Call Control Application.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (e.g., call.initiated, call.answered, call.hangup)'),
      eventId: z.string().describe('Unique event ID'),
      occurredAt: z.string().optional().describe('When the event occurred'),
      callControlId: z.string().optional().describe('Call control ID'),
      callLegId: z.string().optional().describe('Call leg ID'),
      callSessionId: z.string().optional().describe('Call session ID'),
      connectionId: z.string().optional().describe('Connection (application) ID'),
      from: z.string().optional().describe('Caller phone number'),
      to: z.string().optional().describe('Called phone number'),
      direction: z.string().optional().describe('Call direction (incoming/outgoing)'),
      state: z.string().optional().describe('Call state'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      callControlId: z.string().optional().describe('Call control ID for managing the call'),
      callLegId: z.string().optional().describe('Call leg ID'),
      callSessionId: z.string().optional().describe('Call session ID'),
      connectionId: z.string().optional().describe('Connection (application) ID'),
      from: z.string().optional().describe('Caller phone number'),
      to: z.string().optional().describe('Called phone number'),
      direction: z.string().optional().describe('Call direction'),
      state: z.string().optional().describe('Call state'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let event = body?.data;
      if (!event) {
        return { inputs: [] };
      }

      let payload = event.payload ?? {};
      let eventType = event.event_type ?? 'call.unknown';
      let eventId = event.id ?? `call-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            occurredAt: event.occurred_at,
            callControlId: payload.call_control_id,
            callLegId: payload.call_leg_id,
            callSessionId: payload.call_session_id,
            connectionId: payload.connection_id,
            from: payload.from,
            to: payload.to,
            direction: payload.direction,
            state: payload.state,
            rawPayload: payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          callControlId: ctx.input.callControlId,
          callLegId: ctx.input.callLegId,
          callSessionId: ctx.input.callSessionId,
          connectionId: ctx.input.connectionId,
          from: ctx.input.from,
          to: ctx.input.to,
          direction: ctx.input.direction,
          state: ctx.input.state,
          occurredAt: ctx.input.occurredAt
        }
      };
    }
  })
  .build();
