import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let speechToTextCompletion = SlateTrigger.create(spec, {
  name: 'Speech to Text Completion',
  key: 'speech_to_text_completion',
  description:
    'Triggered when an asynchronous speech-to-text transcription task completes. Receives the transcription results automatically without polling.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique event identifier'),
      transcriptionId: z.string().optional().describe('Transcription ID'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      transcriptionId: z.string().optional().describe('Unique transcription identifier'),
      text: z.string().optional().describe('Transcribed text'),
      languageCode: z.string().optional().describe('Detected language code'),
      status: z.string().optional().describe('Transcription status'),
      words: z
        .array(
          z.object({
            text: z.string().optional(),
            start: z.number().optional(),
            end: z.number().optional()
          })
        )
        .optional()
        .describe('Word-level transcription'),
      metadata: z.any().optional().describe('Additional metadata from the webhook')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ElevenLabsClient(ctx.auth.token);

      let result = await client.createWebhook({
        name: 'Slates STT Completion Webhook',
        webhookUrl: ctx.input.webhookBaseUrl
      });

      let data = result as Record<string, unknown>;

      return {
        registrationDetails: {
          webhookId: data.webhook_id as string,
          webhookSecret: data.webhook_secret as string | undefined
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ElevenLabsClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data: Record<string, unknown>;
      try {
        data = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return { inputs: [] };
      }

      let eventType = (data.type || data.event_type || 'speech_to_text.completed') as string;
      let transcriptionId = (data.transcription_id || data.request_id) as string | undefined;
      let eventId = transcriptionId ? `stt_${transcriptionId}` : `stt_${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            transcriptionId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload as Record<string, unknown>;
      let innerData = (payload.data || payload) as Record<string, unknown>;

      let words: Record<string, unknown>[] | undefined;
      if (innerData.words && Array.isArray(innerData.words)) {
        words = (innerData.words as Record<string, unknown>[]).map(w => ({
          text: w.text as string | undefined,
          start: w.start as number | undefined,
          end: w.end as number | undefined
        }));
      }

      return {
        type: `speech_to_text.${ctx.input.eventType.includes('completed') ? 'completed' : ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          transcriptionId: ctx.input.transcriptionId,
          text: innerData.text as string | undefined,
          languageCode: innerData.language_code as string | undefined,
          status: innerData.status as string | undefined,
          words,
          metadata: innerData.metadata || innerData.webhook_metadata
        }
      };
    }
  })
  .build();
