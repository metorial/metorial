import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let voiceEvents = SlateTrigger.create(spec, {
  name: 'Voice Events',
  key: 'voice_events',
  description:
    'Receive voice call lifecycle events via Vonage Voice API webhooks. Includes call state changes (started, ringing, answered, completed), recording completion, DTMF input, and speech recognition results.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Voice event type (e.g., started, ringing, answered, completed, failed, busy, cancelled, rejected, timeout, recording, dtmf, speech)'
        ),
      callUuid: z.string().describe('Call UUID'),
      conversationUuid: z.string().optional().describe('Conversation UUID'),
      timestamp: z.string().optional().describe('Event timestamp'),
      from: z.string().optional().describe('Caller number'),
      to: z.string().optional().describe('Destination number'),
      status: z.string().optional().describe('Call status'),
      direction: z.string().optional().describe('Call direction'),
      duration: z.string().optional().describe('Call duration'),
      rate: z.string().optional().describe('Call rate'),
      price: z.string().optional().describe('Call price'),
      dtmfDigits: z.string().optional().describe('DTMF digits entered'),
      timedOut: z.boolean().optional().describe('Whether DTMF input timed out'),
      recordingUrl: z.string().optional().describe('URL of the recording'),
      speechText: z.string().optional().describe('Recognized speech text'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete raw webhook payload')
    })
  )
  .output(
    z.object({
      callUuid: z.string().describe('Call UUID'),
      conversationUuid: z.string().optional().describe('Conversation UUID'),
      eventType: z.string().describe('Type of voice event'),
      timestamp: z.string().optional().describe('Event timestamp'),
      from: z.string().optional().describe('Caller number'),
      to: z.string().optional().describe('Destination number'),
      status: z.string().optional().describe('Call status'),
      direction: z.string().optional().describe('Call direction (inbound/outbound)'),
      duration: z.string().optional().describe('Call duration in seconds'),
      rate: z.string().optional().describe('Per-minute charge rate'),
      price: z.string().optional().describe('Total call cost'),
      dtmfDigits: z.string().optional().describe('DTMF digits entered by caller'),
      timedOut: z.boolean().optional().describe('Whether DTMF/speech input timed out'),
      recordingUrl: z.string().optional().describe('URL to download the recording'),
      speechText: z.string().optional().describe('Recognized speech text')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: Record<string, unknown>;
      try {
        data = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return { inputs: [] };
      }

      let callUuid = (data.uuid as string) || (data.call_uuid as string) || '';
      if (!callUuid) {
        return { inputs: [] };
      }

      // Determine event type from the webhook data
      let eventType = (data.status as string) || 'unknown';

      // Check for special event types
      if (data.recording_url) {
        eventType = 'recording';
      } else if (data.dtmf) {
        eventType = 'dtmf';
      } else if (data.speech) {
        eventType = 'speech';
      }

      let dtmfData = data.dtmf as Record<string, unknown> | undefined;
      let speechData = data.speech as Record<string, unknown> | undefined;
      let speechResults = speechData?.results as Record<string, unknown>[] | undefined;

      return {
        inputs: [
          {
            eventType,
            callUuid,
            conversationUuid: data.conversation_uuid as string | undefined,
            timestamp: data.timestamp as string | undefined,
            from: data.from as string | undefined,
            to: data.to as string | undefined,
            status: data.status as string | undefined,
            direction: data.direction as string | undefined,
            duration: data.duration as string | undefined,
            rate: data.rate as string | undefined,
            price: data.price as string | undefined,
            dtmfDigits: dtmfData?.digits as string | undefined,
            timedOut: dtmfData?.timed_out as boolean | undefined,
            recordingUrl: data.recording_url as string | undefined,
            speechText: speechResults?.[0]?.text as string | undefined,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { input } = ctx;
      return {
        type: `call.${input.eventType}`,
        id: `${input.callUuid}-${input.eventType}-${input.timestamp || Date.now()}`,
        output: {
          callUuid: input.callUuid,
          conversationUuid: input.conversationUuid,
          eventType: input.eventType,
          timestamp: input.timestamp,
          from: input.from,
          to: input.to,
          status: input.status,
          direction: input.direction,
          duration: input.duration,
          rate: input.rate,
          price: input.price,
          dtmfDigits: input.dtmfDigits,
          timedOut: input.timedOut,
          recordingUrl: input.recordingUrl,
          speechText: input.speechText
        }
      };
    }
  })
  .build();
