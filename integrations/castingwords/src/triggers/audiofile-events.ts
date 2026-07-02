import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let audiofileEvents = SlateTrigger.create(spec, {
  name: 'Audiofile Events',
  key: 'audiofile_events',
  description:
    'Receives webhook notifications from CastingWords when transcription events occur, including transcript completion, duplicate file detection, refund issuance, and difficult audio flagging.'
})
  .input(
    z.object({
      event: z
        .string()
        .describe(
          'Event type (e.g. TRANSCRIPT_COMPLETE, DUPLICATE_FILE, REFUND_ISSUED, DIFFICULT_AUDIO)'
        ),
      audiofileId: z.string().optional().describe('ID of the affected audiofile'),
      orderId: z.string().optional().describe('Associated order ID'),
      originalLink: z.string().optional().describe('URL of the original media file'),
      originalAudiofileId: z
        .string()
        .optional()
        .describe('ID of the previously transcribed audiofile (for duplicate events)'),
      refundAmount: z.string().optional().describe('Refund amount in USD (for refund events)'),
      transactionId: z.string().optional().describe('Refund transaction ID'),
      originalTransactionId: z.string().optional().describe('Original transaction ID')
    })
  )
  .output(
    z.object({
      audiofileId: z.string().optional().describe('ID of the affected audiofile'),
      orderId: z.string().optional().describe('Associated order ID'),
      originalLink: z.string().optional().describe('URL of the original media file'),
      originalAudiofileId: z
        .string()
        .optional()
        .describe('ID of the previously transcribed audiofile (for duplicate events)'),
      refundAmount: z.string().optional().describe('Refund amount in USD (for refund events)'),
      transactionId: z.string().optional().describe('Refund transaction ID'),
      originalTransactionId: z.string().optional().describe('Original transaction ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);
      await client.registerWebhook(ctx.input.webhookBaseUrl);
      return {
        registrationDetails: {
          webhookUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      // CastingWords only supports a single webhook URL per account.
      // Unregistering by setting an empty URL.
      let client = new Client(ctx.auth.token);
      await client.registerWebhook('');
    },

    handleRequest: async ctx => {
      // CastingWords sends webhooks as application/x-www-form-urlencoded
      // but may also appear as query params on GET requests for test events
      let params: Record<string, string> = {};

      let contentType = ctx.request.headers.get('content-type') || '';

      if (contentType.includes('application/x-www-form-urlencoded')) {
        let text = await ctx.request.text();
        let searchParams = new URLSearchParams(text);
        for (let [key, value] of searchParams.entries()) {
          params[key] = value;
        }
      } else if (contentType.includes('application/json')) {
        let json = await ctx.request.json();
        for (let [key, value] of Object.entries(json as Record<string, unknown>)) {
          params[key] = String(value);
        }
      } else {
        // Try URL params as fallback (test webhooks may use query strings)
        let url = new URL(ctx.request.url, 'https://placeholder.local');
        for (let [key, value] of url.searchParams.entries()) {
          params[key] = value;
        }
        // Also try form body
        if (Object.keys(params).length === 0) {
          let text = await ctx.request.text();
          if (text) {
            let searchParams = new URLSearchParams(text);
            for (let [key, value] of searchParams.entries()) {
              params[key] = value;
            }
          }
        }
      }

      let event = params.event || 'UNKNOWN';

      return {
        inputs: [
          {
            event,
            audiofileId: params.audiofile,
            orderId: params.order,
            originalLink: params.originallink,
            originalAudiofileId: params.original_audiofile,
            refundAmount: params.amount,
            transactionId: params.transaction,
            originalTransactionId: params.original_transaction
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.event.toLowerCase();

      // Map CastingWords event names to standardized types
      let typeMap: Record<string, string> = {
        transcript_complete: 'audiofile.transcript_complete',
        duplicate_file: 'audiofile.duplicate_file',
        refund_issued: 'audiofile.refund_issued',
        difficult_audio: 'audiofile.difficult_audio'
      };

      let type = typeMap[eventType] || `audiofile.${eventType}`;
      let id = `${ctx.input.event}_${ctx.input.audiofileId || ctx.input.transactionId || Date.now()}`;

      return {
        type,
        id,
        output: {
          audiofileId: ctx.input.audiofileId,
          orderId: ctx.input.orderId,
          originalLink: ctx.input.originalLink,
          originalAudiofileId: ctx.input.originalAudiofileId,
          refundAmount: ctx.input.refundAmount,
          transactionId: ctx.input.transactionId,
          originalTransactionId: ctx.input.originalTransactionId
        }
      };
    }
  })
  .build();
