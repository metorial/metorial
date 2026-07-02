import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let voiceEvents = SlateTrigger.create(spec, {
  name: 'Voice Call Events',
  key: 'voice_events',
  description:
    'Receive voice call status events and DTMF digit input from collect actions. Configure the webhook URL via the event URL when making outbound calls.'
})
  .input(
    z.object({
      sessionUuid: z.string().optional().describe('Voice session identifier'),
      callUuid: z.string().optional().describe('Individual call identifier'),
      from: z.string().optional().describe('Caller phone number'),
      to: z.string().optional().describe('Called phone number'),
      status: z.string().optional().describe('Call status (e.g., answered, hangup)'),
      digits: z.string().optional().describe('DTMF digits collected from the caller'),
      eventType: z.enum(['call_status', 'dtmf_collect']).describe('Type of voice event')
    })
  )
  .output(
    z.object({
      sessionUuid: z.string().optional().describe('Voice session identifier'),
      callUuid: z.string().optional().describe('Individual call identifier'),
      from: z.string().optional().describe('Caller phone number'),
      to: z.string().optional().describe('Called phone number'),
      status: z.string().optional().describe('Call status'),
      digits: z.string().optional().describe('DTMF digits collected from the caller')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;

      try {
        body = await ctx.request.json();
      } catch {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      }

      let sessionUuid = body['mocean-session-uuid'] || body.session_uuid;
      let callUuid = body['mocean-call-uuid'] || body.call_uuid;
      let from = body['mocean-from'] ? String(body['mocean-from']) : undefined;
      let to = body['mocean-to'] ? String(body['mocean-to']) : undefined;
      let digits = body['mocean-digits'];
      let status = body['mocean-status'] || body.status;

      // If digits are present, this is a DTMF collect event
      if (digits !== undefined) {
        return {
          inputs: [
            {
              eventType: 'dtmf_collect' as const,
              sessionUuid,
              callUuid,
              from,
              to,
              digits: String(digits)
            }
          ]
        };
      }

      return {
        inputs: [
          {
            eventType: 'call_status' as const,
            sessionUuid,
            callUuid,
            from,
            to,
            status: status ? String(status) : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      if (input.eventType === 'dtmf_collect') {
        return {
          type: 'voice.dtmf_collect',
          id: `voice_dtmf_${input.callUuid || input.sessionUuid}_${Date.now()}`,
          output: {
            sessionUuid: input.sessionUuid,
            callUuid: input.callUuid,
            from: input.from,
            to: input.to,
            digits: input.digits
          }
        };
      }

      return {
        type: 'voice.call_status',
        id: `voice_status_${input.callUuid || input.sessionUuid}_${input.status || Date.now()}`,
        output: {
          sessionUuid: input.sessionUuid,
          callUuid: input.callUuid,
          from: input.from,
          to: input.to,
          status: input.status
        }
      };
    }
  })
  .build();
