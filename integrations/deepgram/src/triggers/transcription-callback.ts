import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let callbackInputSchema = z.object({
  requestId: z.string().describe('Request ID from Deepgram.'),
  eventType: z
    .enum(['transcription.completed', 'speech.completed'])
    .describe('Type of callback event.'),
  payload: z.any().describe('Full callback response payload from Deepgram.')
});

let transcriptionOutputSchema = z.object({
  requestId: z.string().describe('Request ID from Deepgram.'),
  transcript: z.string().optional().describe('Full transcript text.'),
  confidence: z.number().optional().describe('Confidence score.'),
  channels: z.any().optional().describe('Per-channel results.'),
  metadata: z.any().optional().describe('Request metadata.'),
  rawResponse: z.any().optional().describe('Complete raw response from Deepgram.')
});

export let transcriptionCallbackTrigger = SlateTrigger.create(spec, {
  name: 'Transcription Callback',
  key: 'transcription_callback',
  description:
    'Receives asynchronous transcription results via webhook callback. When submitting a transcription request with a callback URL, Deepgram will POST the results to this endpoint once processing is complete.'
})
  .input(callbackInputSchema)
  .output(transcriptionOutputSchema)
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await ctx.request.json();
      } else {
        let text = await ctx.request.text();
        try {
          data = JSON.parse(text);
        } catch {
          return { inputs: [] };
        }
      }

      let requestId = data?.metadata?.request_id || data?.request_id || '';
      let isTranscription = data?.results?.channels !== undefined;
      let eventType: 'transcription.completed' | 'speech.completed' = isTranscription
        ? 'transcription.completed'
        : 'speech.completed';

      return {
        inputs: [
          {
            requestId,
            eventType,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload;

      let firstAlt = payload?.results?.channels?.[0]?.alternatives?.[0];

      return {
        type: ctx.input.eventType,
        id: ctx.input.requestId || `callback-${Date.now()}`,
        output: {
          requestId: ctx.input.requestId,
          transcript: firstAlt?.transcript,
          confidence: firstAlt?.confidence,
          channels: payload?.results?.channels,
          metadata: payload?.metadata,
          rawResponse: payload
        }
      };
    }
  })
  .build();
