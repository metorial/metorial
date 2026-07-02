import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let callEventTrigger = SlateTrigger.create(spec, {
  name: 'Call Event',
  key: 'call_event',
  description:
    'Receives real-time call event notifications via webhook. Covers all call lifecycle events including START, RING, RINGRESULT, READY, JOIN, LEAVE, and COMPLETED. Configure the webhook URL in TelTel account settings under "Webhook for full call notifications URL".'
})
  .input(
    z.object({
      event: z
        .string()
        .describe(
          'Call event type (e.g. START, RING, RINGRESULT, READY, JOIN, LEAVE, COMPLETED)'
        ),
      callId: z.string().describe('Unique identifier for the call'),
      phone: z.string().optional().describe('Phone number involved in the call'),
      callerId: z.string().optional().describe('Caller ID'),
      user: z.string().optional().describe('TelTel user associated with the call'),
      userId: z.string().optional().describe('TelTel user ID'),
      startTime: z.string().optional().describe('Call start time'),
      duration: z.string().optional().describe('Call duration in seconds'),
      status: z.string().optional().describe('Call status or result'),
      audioUrl: z.string().optional().describe('URL for the call audio recording'),
      raw: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('Unique identifier for the call'),
      event: z.string().describe('Call event type'),
      phone: z.string().optional().describe('Phone number involved in the call'),
      callerId: z.string().optional().describe('Caller ID'),
      user: z.string().optional().describe('TelTel user associated with the call'),
      userId: z.string().optional().describe('TelTel user ID'),
      startTime: z.string().optional().describe('Call start time'),
      duration: z.string().optional().describe('Call duration in seconds'),
      status: z.string().optional().describe('Call status or result'),
      audioUrl: z.string().optional().describe('URL for the call audio recording')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let url = new URL(ctx.request.url);
      let params = url.searchParams;

      // TelTel sends webhook as GET request with query parameters (JSON-encoded string)
      let event = params.get('event') || params.get('type') || '';
      let callId = params.get('call_id') || params.get('uniqueid') || params.get('id') || '';
      let phone =
        params.get('phone') || params.get('called') || params.get('calling') || undefined;
      let callerId = params.get('callerid') || params.get('caller_id') || undefined;
      let user = params.get('user') || params.get('user_name') || undefined;
      let userId = params.get('user_id') || undefined;
      let startTime = params.get('start_time') || params.get('start') || undefined;
      let duration = params.get('duration') || undefined;
      let status = params.get('status') || params.get('result') || undefined;
      let audioUrl =
        params.get('audio_url') ||
        params.get('audio') ||
        params.get('recording_url') ||
        undefined;

      let raw: Record<string, any> = {};
      params.forEach((value, key) => {
        raw[key] = value;
      });

      // If no query params found, try to parse body (in case of POST)
      if (!event && !callId) {
        try {
          let body = (await ctx.request.json()) as Record<string, any>;
          event = body.event || body.type || '';
          callId = body.call_id || body.uniqueid || body.id || '';
          phone = body.phone || body.called || body.calling;
          callerId = body.callerid || body.caller_id;
          user = body.user || body.user_name;
          userId = body.user_id;
          startTime = body.start_time || body.start;
          duration = body.duration?.toString();
          status = body.status || body.result;
          audioUrl = body.audio_url || body.audio || body.recording_url;
          raw = body;
        } catch {
          // No valid body
        }
      }

      if (!callId) {
        callId = `call_${Date.now()}`;
      }

      return {
        inputs: [
          {
            event,
            callId,
            phone: phone || undefined,
            callerId: callerId || undefined,
            user: user || undefined,
            userId: userId || undefined,
            startTime: startTime || undefined,
            duration: duration || undefined,
            status: status || undefined,
            audioUrl: audioUrl || undefined,
            raw
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.event?.toLowerCase() || 'unknown';

      return {
        type: `call.${eventType}`,
        id: `${ctx.input.callId}_${eventType}`,
        output: {
          callId: ctx.input.callId,
          event: ctx.input.event,
          phone: ctx.input.phone,
          callerId: ctx.input.callerId,
          user: ctx.input.user,
          userId: ctx.input.userId,
          startTime: ctx.input.startTime,
          duration: ctx.input.duration,
          status: ctx.input.status,
          audioUrl: ctx.input.audioUrl
        }
      };
    }
  })
  .build();
