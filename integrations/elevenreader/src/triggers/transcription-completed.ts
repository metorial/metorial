import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let transcriptionCompletedTrigger = SlateTrigger.create(spec, {
  name: 'Transcription Completed',
  key: 'transcription_completed',
  description:
    'Triggered when an asynchronous (batch) speech-to-text transcription task completes. The webhook URL is specified when submitting the transcription request.',
  instructions: [
    "Provide this trigger's webhook URL when creating an async speech-to-text request."
  ]
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      transcriptionId: z.string().optional().describe('ID of the completed transcription'),
      requestId: z.string().optional().describe('Original request ID'),
      status: z.string().optional().describe('Completion status'),
      text: z.string().optional().describe('Transcribed text'),
      languageCode: z.string().optional().describe('Detected language'),
      rawPayload: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      transcriptionId: z.string().optional().describe('ID of the completed transcription'),
      requestId: z.string().optional().describe('Original request ID'),
      status: z.string().optional().describe('Completion status'),
      text: z.string().optional().describe('Transcribed text'),
      languageCode: z.string().optional().describe('Detected language')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventId =
        body.event_id ||
        body.transcription_id ||
        body.request_id ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      return {
        inputs: [
          {
            eventId,
            transcriptionId: body.transcription_id || body.data?.transcription_id,
            requestId: body.request_id || body.data?.request_id,
            status: body.status || body.data?.status || 'completed',
            text: body.text || body.data?.text,
            languageCode: body.language_code || body.data?.language_code,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'transcription.completed',
        id: ctx.input.eventId,
        output: {
          transcriptionId: ctx.input.transcriptionId,
          requestId: ctx.input.requestId,
          status: ctx.input.status,
          text: ctx.input.text,
          languageCode: ctx.input.languageCode
        }
      };
    }
  })
  .build();
